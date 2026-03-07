"""
Views for Bulk Batch Split functionality.
Allows distributors to divide a batch into multiple smaller batches atomically.
"""
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import uuid

from . import models
from .event_logger import log_batch_event
from .models import BatchEventType, BatchStatus, StakeholderRole


class BulkSplitBatchView(APIView):
    """
    Split a batch into multiple child batches atomically.
    The sum of child quantities must exactly equal the parent quantity.
    The parent batch is marked as FULLY_SPLIT and quantity becomes 0.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, batch_id):
        splits = request.data.get('splits', [])
        
        if not splits:
            return Response(
                {"success": False, "message": "At least one split is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Get and lock parent batch
                try:
                    parent_batch = models.CropBatch.objects.select_for_update().get(id=batch_id)
                except models.CropBatch.DoesNotExist:
                    return Response(
                        {"success": False, "message": "Parent batch not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )

                # Status Guards
                if parent_batch.status == BatchStatus.SUSPENDED:
                    return Response(
                        {"success": False, "message": "Cannot split a suspended batch."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if parent_batch.status == BatchStatus.FULLY_SPLIT:
                    return Response(
                        {"success": False, "message": "Batch has already been fully split."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if parent_batch.status != BatchStatus.STORED:
                    return Response(
                        {"success": False, "message": f"Only batches in STORED status can be split. Current status: {parent_batch.status}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Permission Check
                try:
                    profile = request.user.stakeholderprofile
                except models.StakeholderProfile.DoesNotExist:
                    return Response(
                        {"success": False, "message": "User profile not found."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if profile.role != StakeholderRole.DISTRIBUTOR:
                    return Response(
                        {"success": False, "message": "Only distributors can split batches."},
                        status=status.HTTP_403_FORBIDDEN
                    )

                if parent_batch.current_owner != request.user:
                    return Response(
                        {"success": False, "message": "You do not own this batch."},
                        status=status.HTTP_403_FORBIDDEN
                    )

                # Quantity Validation
                parent_quantity = float(parent_batch.quantity)
                total_child_quantity = 0.0
                for s in splits:
                    try:
                        total_child_quantity += float(s.get('quantity', 0))
                    except (ValueError, TypeError):
                        return Response(
                            {"success": False, "message": "Invalid quantity in one of the splits."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # Allow a very tiny margin for floating point errors if necessary, 
                # but business logic says it must match parent. Let's be strict but use round.
                if round(total_child_quantity, 2) != round(parent_quantity, 2):
                    return Response(
                        {
                            "success": False, 
                            "message": f"Total split quantity ({total_child_quantity} kg) must exactly match parent quantity ({parent_quantity} kg)."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                created_children = []
                # Create Child Batches
                for split_info in splits:
                    child_batch = models.CropBatch.objects.create(
                        farmer=parent_batch.farmer,
                        current_owner=request.user,
                        status=BatchStatus.STORED,
                        farm_location=parent_batch.farm_location,
                        is_child_batch=True,
                        parent_batch=parent_batch,
                        crop_type=parent_batch.crop_type,
                        quantity=split_info['quantity'],
                        harvest_date=parent_batch.harvest_date,
                        farmer_base_price_per_unit=parent_batch.farmer_base_price_per_unit,
                        distributor_margin_per_unit=parent_batch.distributor_margin_per_unit,
                    )
                    
                    # Create split record
                    models.BatchSplit.objects.create(
                        parent_batch=parent_batch,
                        split_label=split_info.get('label', f"Split from {parent_batch.product_batch_id}"),
                        quantity=split_info['quantity'],
                        child_batch=child_batch,
                        notes=split_info.get('notes', '')
                    )
                    
                    # Log creation of child batch
                    log_batch_event(
                        batch=child_batch,
                        event_type=BatchEventType.CREATED,
                        user=request.user,
                        metadata={
                            "action": "SPLIT_FROM_PARENT",
                            "parent_batch_id": parent_batch.product_batch_id
                        }
                    )
                    created_children.append(child_batch)

                # Update Parent Batch
                old_status = parent_batch.status
                parent_batch.status = BatchStatus.FULLY_SPLIT
                parent_batch.quantity = 0
                parent_batch.save()

                # Log parent split event
                log_batch_event(
                    batch=parent_batch,
                    event_type=BatchEventType.FULLY_SPLIT,
                    user=request.user,
                    metadata={
                        "old_status": old_status,
                        "child_count": len(created_children),
                        "child_batch_ids": [c.product_batch_id for c in created_children]
                    }
                )

                return Response(
                    {
                        "success": True,
                        "message": f"Successfully split into {len(created_children)} child batches.",
                        "parent_batch_id": parent_batch.id,
                        "child_batches": [
                            {"id": c.id, "batch_id": c.product_batch_id, "quantity": float(c.quantity)}
                            for c in created_children
                        ]
                    },
                    status=status.HTTP_201_CREATED
                )

        except Exception as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
