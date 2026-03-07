"""
Views for Distributor-specific actions.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from . import models
from .batch_validators import BatchStatusTransitionValidator
from .event_logger import log_batch_event
from .models import BatchEventType, BatchStatus, PaymentStatus, FinancialStatus
from .view_utils import check_batch_locked


class StoreBatchView(APIView):
    """
    Distributor marks batch as stored.
    Transitions from DELIVERED_TO_DISTRIBUTOR to STORED_BY_DISTRIBUTOR.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, batch_id):
        # Get batch
        try:
            batch = models.CropBatch.objects.get(id=batch_id)
        except models.CropBatch.DoesNotExist:
            return Response(
                {"success": False, "message": "Batch not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Suspend guard
        if batch.status == BatchStatus.SUSPENDED:
            return Response({'success': False, 'message': 'This batch has been suspended and cannot proceed further.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if batch.status == BatchStatus.FULLY_SPLIT:
            return Response({'success': False, 'message': 'This batch has been fully split and is no longer active.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify user is distributor
        try:
            distributor_profile = request.user.stakeholderprofile
            if distributor_profile.role != models.StakeholderRole.DISTRIBUTOR:
                return Response(
                    {"success": False, "message": "Only distributors can store batches"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify ownership
        if batch.current_owner != request.user:
            return Response(
                {"success": False, "message": "You do not own this batch"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify status
        if batch.status != BatchStatus.DELIVERED_TO_DISTRIBUTOR:
            return Response(
                {"success": False, "message": f"Cannot store batch with status {batch.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if batch is locked
        is_locked, lock_response = check_batch_locked(batch)
        if is_locked:
            return lock_response
        
        # Validate transition
        if not BatchStatusTransitionValidator.can_transition(
            batch, request.user, BatchStatus.STORED
        ):
            return Response(
                {"success": False, "message": "Invalid status transition"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status and margin
        print(f"DEBUG: StoreBatchView request.data={request.data}")
        margin = request.data.get('distributor_margin_per_unit', 0)
        try:
            batch.distributor_margin_per_unit = float(margin)
        except (ValueError, TypeError):
            batch.distributor_margin_per_unit = 0
            
        batch.status = BatchStatus.STORED
        batch.save()
        
        # Log event
        log_batch_event(
            batch=batch,
            event_type=BatchEventType.STORED,
            user=request.user,
            metadata={}
        )
        
        return Response({
            "success": True,
            "message": "Batch marked as stored",
            "batch_id": batch.id,
            "status": batch.status,
        }, status=status.HTTP_200_OK)


class RequestTransportToRetailerView(APIView):
    """
    Distributor requests transport to retailer.
    Transitions from STORED_BY_DISTRIBUTOR to TRANSPORT_REQUESTED_TO_RETAILER.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        batch_id = request.data.get('batch_id')
        retailer_id = request.data.get('retailer_id')
        
        if not batch_id or not retailer_id:
            return Response(
                {"success": False, "message": "batch_id and retailer_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get batch
        try:
            batch = models.CropBatch.objects.get(id=batch_id)
        except models.CropBatch.DoesNotExist:
            return Response(
                {"success": False, "message": "Batch not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Suspend guard
        if batch.status == BatchStatus.SUSPENDED:
            return Response({'success': False, 'message': 'This batch has been suspended and cannot proceed further.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if batch.status == BatchStatus.FULLY_SPLIT:
            return Response({'success': False, 'message': 'This batch has been fully split and is no longer active.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get retailer
        try:
            retailer = models.StakeholderProfile.objects.get(
                id=retailer_id,
                role=models.StakeholderRole.RETAILER
            )
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "Retailer not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify user is distributor and owns batch
        try:
            distributor_profile = request.user.stakeholderprofile
            if distributor_profile.role != models.StakeholderRole.DISTRIBUTOR:
                return Response(
                    {"success": False, "message": "Only distributors can request transport"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if batch.current_owner != request.user:
            return Response(
                {"success": False, "message": "You do not own this batch"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify status
        if batch.status != BatchStatus.STORED:
            return Response(
                {"success": False, "message": f"Cannot request transport for batch with status {batch.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if batch is locked
        is_locked, lock_response = check_batch_locked(batch)
        if is_locked:
            return lock_response
        
        # Create transport request
        transport_request = models.TransportRequest.objects.create(
            batch=batch,
            requested_by=distributor_profile,
            from_party=distributor_profile,
            to_party=retailer,
            status='PENDING'
        )
        
        # Update batch status
        batch.status = BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER
        batch.save()
        
        # Log event
        log_batch_event(
            batch=batch,
            event_type=BatchEventType.TRANSPORT_REQUESTED_TO_RETAILER,
            user=request.user,
            metadata={
                'retailer': retailer.user.username,
                'transport_request_id': transport_request.id,
            }
        )
        
        return Response({
            "success": True,
            "message": "Transport request created successfully",
            "transport_request_id": transport_request.id,
            "batch_status": batch.status,
        }, status=status.HTTP_201_CREATED)
