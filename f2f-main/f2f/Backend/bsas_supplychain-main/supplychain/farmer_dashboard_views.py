"""Farmer dashboard views for user-specific analytics."""
from django.db.models import Count, Sum, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from supplychain import models


class IsFarmerUser:
    """Verify the user has a farmer role."""
    
    @staticmethod
    def check_farmer_role(user):
        if not user.is_authenticated:
            return False, "Authentication required"
        try:
            profile = user.stakeholderprofile
            if profile.role != models.StakeholderRole.FARMER:
                return False, "Only farmers can access this dashboard"
            return True, profile
        except:
            return False, "User profile not found"


class FarmerDashboardView(APIView):
    """
    Get farmer-specific dashboard analytics.
    
    Returns:
        - metrics: Total batches, active batches, completed batches, total revenue
        - status_distribution: Count of batches by status
        - crop_distribution: Count of batches by crop type
        - recent_batches: List of recent batches for the farmer
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Verify user is a farmer
        is_farmer, result = IsFarmerUser.check_farmer_role(request.user)
        if not is_farmer:
            return Response(
                {"success": False, "message": result},
                status=status.HTTP_403_FORBIDDEN
            )
        
        farmer_profile = result
        
        # Get all batches for this farmer (exclude child batches - show only original)
        farmer_batches = models.CropBatch.objects.filter(
            farmer=farmer_profile,
            is_child_batch=False
        )
        
        # Calculate metrics
        total_batches = farmer_batches.count()
        
        # Active batches: exclude suspended, completed (sold), and fully split
        active_statuses = [
            models.BatchStatus.CREATED,
            models.BatchStatus.TRANSPORT_REQUESTED,
            models.BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR,
            models.BatchStatus.ARRIVED_AT_DISTRIBUTOR,
            models.BatchStatus.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR,
            models.BatchStatus.DELIVERED_TO_DISTRIBUTOR,
            models.BatchStatus.STORED,
            models.BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER,
            models.BatchStatus.IN_TRANSIT_TO_RETAILER,
            models.BatchStatus.ARRIVED_AT_RETAILER,
            models.BatchStatus.ARRIVAL_CONFIRMED_BY_RETAILER,
            models.BatchStatus.DELIVERED_TO_RETAILER,
            models.BatchStatus.LISTED,
        ]
        active_batches = farmer_batches.filter(status__in=active_statuses).count()
        
        # Completed batches: SOLD status
        completed_batches = farmer_batches.filter(status=models.BatchStatus.SOLD).count()
        
        # Calculate total revenue from sold batches
        # Revenue = quantity * farmer_base_price_per_unit for sold batches
        sold_batches = farmer_batches.filter(status=models.BatchStatus.SOLD)
        total_revenue = sum(
            float(batch.quantity) * float(batch.farmer_base_price_per_unit)
            for batch in sold_batches
        ) if sold_batches.exists() else 0
        
        # Batch status distribution
        status_distribution = (
            farmer_batches.values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Format status distribution with labels
        status_dist_formatted = []
        for item in status_distribution:
            status_label = dict(models.BatchStatus.choices).get(item['status'], item['status'])
            status_dist_formatted.append({
                'status': item['status'],
                'label': status_label,
                'count': item['count']
            })
        
        # Crop type distribution
        crop_distribution = (
            farmer_batches.values('crop_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Recent batches (last 10)
        recent_batches = farmer_batches.order_by('-created_at')[:10]
        recent_batches_data = []
        for batch in recent_batches:
            recent_batches_data.append({
                'id': batch.id,
                'product_batch_id': batch.product_batch_id,
                'crop_type': batch.crop_type,
                'quantity': str(batch.quantity),
                'harvest_date': batch.harvest_date.isoformat() if batch.harvest_date else None,
                'farm_location': batch.farm_location,
                'status': batch.status,
                'status_label': dict(models.BatchStatus.choices).get(batch.status, batch.status),
                'created_at': batch.created_at.isoformat() if batch.created_at else None,
            })
        
        # Check if farmer has no batches (for empty state)
        has_batches = total_batches > 0
        
        # Payment-derived financial metrics (from Payment model only)
        total_received = models.Payment.objects.filter(
            payee=farmer_profile,
            payment_type=models.PaymentType.BATCH_PAYMENT,
            status=models.PaymentStatus.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        total_paid_transport = models.Payment.objects.filter(
            payer=farmer_profile,
            payment_type=models.PaymentType.TRANSPORT_SHARE,
            status=models.PaymentStatus.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        pending_confirmations = models.Payment.objects.filter(
            payee=farmer_profile,
            status=models.PaymentStatus.AWAITING_CONFIRMATION
        ).count()
        
        return Response({
            "success": True,
            "data": {
                "metrics": {
                    "total_batches": total_batches,
                    "active_batches": active_batches,
                    "completed_batches": completed_batches,
                    "total_revenue": round(total_revenue, 2),
                },
                "financial": {
                    "total_received": float(total_received),
                    "total_paid_transport": float(total_paid_transport),
                    "net_earnings": float(total_received - total_paid_transport),
                    "pending_confirmations": pending_confirmations,
                },
                "status_distribution": status_dist_formatted,
                "crop_distribution": list(crop_distribution),
                "recent_batches": recent_batches_data,
                "has_batches": has_batches,
            }
        })
