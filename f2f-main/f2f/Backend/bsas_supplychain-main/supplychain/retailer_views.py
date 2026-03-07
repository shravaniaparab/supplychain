"""
Views for Retailer-specific actions.
"""
from decimal import Decimal
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from . import models
from .batch_validators import BatchStatusTransitionValidator
from .models import StakeholderProfile, StakeholderRole, CropBatch, BatchStatus, BatchEventType, RetailListing
from .event_logger import log_batch_event
from .view_utils import check_batch_locked


class MarkBatchSoldView(APIView):
    """
    Retailer marks a portion or all of a batch as sold.
    Supports partial sales with quantity tracking.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, batch_id):
        # Get sold_quantity from request (default to all remaining if not specified)
        sold_quantity_str = request.data.get('sold_quantity', None)
        
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
            return Response(
                {"success": False, "message": "This batch has been suspended and cannot proceed further."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Financial lock guard
        # Batch lock guard
        is_locked, lock_response = check_batch_locked(batch)
        if is_locked:
            return lock_response
        
        # Verify user is retailer
        try:
            retailer_profile = request.user.stakeholderprofile
            if retailer_profile.role != models.StakeholderRole.RETAILER:
                return Response(
                    {"success": False, "message": "Only retailers can mark batches as sold"},
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
        
        # Verify status - batch must be LISTED to sell
        if batch.status != BatchStatus.LISTED:
            return Response(
                {"success": False, "message": f"Cannot sell batch with status {batch.status}. Batch must be LISTED first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the retail listing for this batch
        try:
            listing = models.RetailListing.objects.get(batch=batch, retailer=retailer_profile)
        except models.RetailListing.DoesNotExist:
            return Response(
                {"success": False, "message": "No retail listing found for this batch"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if listing is for sale
        if not listing.is_for_sale:
            return Response(
                {"success": False, "message": "This listing is not available for sale"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate remaining quantity
        if listing.remaining_quantity <= 0:
            return Response(
                {"success": False, "message": "No remaining quantity available for sale"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse and validate sold_quantity
        if sold_quantity_str is not None:
            try:
                sold_quantity = Decimal(str(sold_quantity_str))
            except (ValueError, TypeError):
                return Response(
                    {"success": False, "message": "Invalid sold_quantity value"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Default to selling all remaining quantity
            sold_quantity = listing.remaining_quantity
        
        # Validate sold_quantity constraints
        if sold_quantity <= 0:
            return Response(
                {"success": False, "message": "Sold quantity must be greater than 0"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if sold_quantity > listing.remaining_quantity:
            return Response(
                {"success": False, "message": f"Cannot sell more than available. Available: {listing.remaining_quantity}, Requested: {sold_quantity}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate revenue for this sale
        sale_revenue = sold_quantity * listing.selling_price_per_unit
        
        # Update listing quantities atomically
        with transaction.atomic():
            listing.remaining_quantity -= sold_quantity
            listing.units_sold += sold_quantity
            listing.total_revenue_generated += sale_revenue
            
            # If all quantity sold, mark listing as not for sale and batch as SOLD
            if listing.remaining_quantity <= 0:
                listing.is_for_sale = False
                batch.status = BatchStatus.SOLD
                batch.save()
                is_fully_sold = True
            else:
                is_fully_sold = False
            
            listing.save()
        
        # Log event with quantity details
        log_batch_event(
            batch=batch,
            event_type=BatchEventType.SOLD,
            user=request.user,
            metadata={
                'sold_quantity': float(sold_quantity),
                'sale_revenue': float(sale_revenue),
                'remaining_quantity': float(listing.remaining_quantity),
                'is_fully_sold': is_fully_sold
            }
        )
        
        return Response({
            "success": True,
            "message": f"Sold {sold_quantity} units successfully" if not is_fully_sold else "All inventory sold successfully",
            "batch_id": batch.id,
            "status": batch.status,
            "sold_quantity": float(sold_quantity),
            "sale_revenue": float(sale_revenue),
            "remaining_quantity": float(listing.remaining_quantity),
            "total_revenue_generated": float(listing.total_revenue_generated),
            "is_fully_sold": is_fully_sold
        }, status=status.HTTP_200_OK)
