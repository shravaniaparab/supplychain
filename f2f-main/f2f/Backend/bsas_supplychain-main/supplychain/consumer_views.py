from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from . import models


class BatchTraceView(APIView):
    """
    Public API to trace batch history for consumers.
    Returns complete supply chain journey.
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request, public_id):
        # Get batch by public_batch_id OR product_batch_id (human readable)
        from django.db.models import Q
        try:
            # We first try exact matches, then fallback to partial product_batch_id matches.
            # Using first() after order_by('-created_at') to ensure we get a result.
            batch = models.CropBatch.objects.select_related(
                'farmer__user', 
                'parent_batch'
            ).filter(
                Q(public_batch_id__iexact=public_id) | 
                Q(product_batch_id__iexact=public_id) |
                Q(product_batch_id__icontains=public_id)
            ).order_by('-created_at').first()
            
            if not batch:
                raise models.CropBatch.DoesNotExist
        except models.CropBatch.DoesNotExist:
            return Response(
                {"success": False, "message": "Batch not found or not listed for sale."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validation: Only return data if status >= LISTED
        # We check both LISTED and SOLD
        allowed_statuses = [models.BatchStatus.LISTED, models.BatchStatus.SOLD]
        if batch.status not in allowed_statuses:
            return Response(
                {"success": False, "message": "Product not yet available for public verification."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Fetch Listing for price breakdown
        listing = models.RetailListing.objects.filter(batch=batch).last()
        
        # Calculate parent batch quantity if split
        parent_qty = batch.quantity
        if batch.is_child_batch and batch.parent_batch:
            parent_qty = batch.parent_batch.quantity

        # Fetch Timeline from BatchEvents
        # Sorted oldest to newest
        events = models.BatchEvent.objects.filter(batch=batch).order_by('timestamp')
        timeline = []
        for event in events:
            timeline.append({
                "stage": event.get_event_type_display(),
                "actor": event.performed_by.username if event.performed_by else "System",
                "timestamp": event.timestamp.isoformat()
            })
        
        # Build response according to SPEC
        response_data = {
            "product_name": batch.crop_type,
            "batch_id": batch.product_batch_id,
            "quantity": f"{batch.quantity} kg",
            "retail_price": listing.total_price if listing else 0,
            "status": batch.get_status_display(),
            "origin": {
                "farmer_name": batch.farmer.user.username,
                "farm_location": batch.farm_location,
                "harvest_date": batch.harvest_date.isoformat(),
                "parent_batch_quantity": f"{parent_qty} kg"
            },
            "price_breakdown": {
                "farmer_price": float(listing.farmer_base_price) if listing else 0,
                "transport_cost": float(listing.transport_fees) if listing else 0,
                "distributor_margin": float(listing.distributor_margin) if listing else 0,
                "retailer_margin": float(listing.retailer_margin) if listing else 0,
                "total_price": float(listing.total_price) if listing else 0
            },
            "timeline": timeline,
            "qr_code_url": batch.qr_code_image.url if batch.qr_code_image else None
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
