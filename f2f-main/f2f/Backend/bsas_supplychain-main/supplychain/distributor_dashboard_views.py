"""
Distributor Dashboard Views
Provides analytics and metrics specific to the logged-in distributor.
"""
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from . import models
from .models import StakeholderRole, CropBatch, TransportRequest


class DistributorDashboardView(APIView):
    """
    Returns distributor-specific analytics including:
    - Metrics (incoming batches, inventory, outgoing, revenue)
    - Inventory distribution for doughnut chart
    - Monthly activity for bar/line chart
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Verify user is a distributor
        try:
            profile = request.user.stakeholderprofile
            if profile.role != StakeholderRole.DISTRIBUTOR:
                return Response(
                    {"error": "Only distributors can access this dashboard"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get batches where distributor is the current owner
        distributor_batches = CropBatch.objects.filter(current_owner=request.user)

        # --- METRICS SECTION ---
        # Incoming Batches: Delivered to distributor but not yet stored
        incoming_statuses = [
            'DELIVERED_TO_DISTRIBUTOR',
            'ARRIVED_AT_DISTRIBUTOR',
            'ARRIVAL_CONFIRMED_BY_DISTRIBUTOR'
        ]
        incoming_batches = distributor_batches.filter(
            status__in=incoming_statuses
        ).count()

        # Current Inventory: Stored or fully split batches
        inventory_statuses = ['STORED', 'FULLY_SPLIT']
        inventory_count = distributor_batches.filter(
            status__in=inventory_statuses
        ).count()

        # Current Inventory Quantity (in kg)
        inventory_quantity_result = distributor_batches.filter(
            status__in=inventory_statuses
        ).aggregate(total=Sum('quantity'))
        inventory_quantity = float(inventory_quantity_result['total'] or 0)

        # Outgoing Shipments: Transport requests initiated by distributor
        outgoing_requests = TransportRequest.objects.filter(
            from_party=profile
        ).exclude(
            status__in=['DELIVERED', 'REJECTED']
        ).count()

        # Total Outgoing (all time)
        total_outgoing = TransportRequest.objects.filter(
            from_party=profile,
            status='DELIVERED'
        ).count()

        # Total Revenue: Sum of distributor margin from delivered batches
        # Calculate from batches where distributor stored them
        stored_batches = distributor_batches.filter(
            status__in=['STORED', 'FULLY_SPLIT', 'TRANSPORT_REQUESTED_TO_RETAILER',
                       'IN_TRANSIT_TO_RETAILER', 'ARRIVED_AT_RETAILER',
                       'ARRIVAL_CONFIRMED_BY_RETAILER', 'DELIVERED_TO_RETAILER', 'LISTED', 'SOLD']
        )
        total_revenue = sum(
            float(batch.quantity) * float(batch.distributor_margin_per_unit)
            for batch in stored_batches
        ) if stored_batches.exists() else 0

        # --- INVENTORY DISTRIBUTION (for Doughnut Chart) ---
        # Group inventory by crop_type
        inventory_by_crop = distributor_batches.filter(
            status__in=inventory_statuses
        ).values('crop_type').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity')
        ).order_by('-total_quantity')

        inventory_distribution = {}
        for item in inventory_by_crop:
            crop = item['crop_type']
            inventory_distribution[crop] = {
                'count': item['count'],
                'quantity': float(item['total_quantity'] or 0)
            }

        # --- MONTHLY ACTIVITY (for Bar/Line Chart) ---
        # Get monthly incoming and outgoing counts for the last 12 months
        twelve_months_ago = timezone.now() - timezone.timedelta(days=365)

        # Incoming: Batches delivered to distributor by month
        incoming_monthly = distributor_batches.filter(
            status__in=['DELIVERED_TO_DISTRIBUTOR', 'STORED', 'FULLY_SPLIT'],
            created_at__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        # Outgoing: Transport requests to retailers by month
        outgoing_monthly = TransportRequest.objects.filter(
            from_party=profile,
            status__in=['DELIVERED', 'IN_TRANSIT_TO_RETAILER', 'ARRIVED_AT_RETAILER'],
            created_at__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        # Build monthly activity map
        months_set = set()
        incoming_map = {}
        outgoing_map = {}

        for item in incoming_monthly:
            if item['month']:
                month_key = item['month'].strftime('%b')
                months_set.add(month_key)
                incoming_map[month_key] = item['count']

        for item in outgoing_monthly:
            if item['month']:
                month_key = item['month'].strftime('%b')
                months_set.add(month_key)
                outgoing_map[month_key] = item['count']

        # Sort months chronologically (Jan, Feb, Mar, etc.)
        month_order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        sorted_months = sorted(months_set, key=lambda x: month_order.index(x) if x in month_order else 99)

        monthly_activity = {
            'months': sorted_months,
            'incoming': [incoming_map.get(m, 0) for m in sorted_months],
            'outgoing': [outgoing_map.get(m, 0) for m in sorted_months],
        }

        # --- PAYMENT-DERIVED FINANCIAL METRICS ---
        from .models import Payment, PaymentStatus, PaymentType, StakeholderRole as SR
        
        paid_to_farmers = Payment.objects.filter(
            payer=profile, payee_role=SR.FARMER, status=PaymentStatus.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        received_from_retailers = Payment.objects.filter(
            payee=profile, payer_role=SR.RETAILER, status=PaymentStatus.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        paid_transport = Payment.objects.filter(
            payer=profile, payment_type=PaymentType.TRANSPORT_SHARE, status=PaymentStatus.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        pending_payments_count = Payment.objects.filter(
            payer=profile, status=PaymentStatus.PENDING
        ).count()

        # Build response
        response_data = {
            'metrics': {
                'incoming_batches': incoming_batches,
                'inventory_count': inventory_count,
                'inventory_quantity': round(inventory_quantity, 2),
                'outgoing_shipments': outgoing_requests,
                'total_outgoing': total_outgoing,
                'total_revenue': round(total_revenue, 2),
            },
            'financial': {
                'paid_to_farmers': float(paid_to_farmers),
                'received_from_retailers': float(received_from_retailers),
                'paid_transport': float(paid_transport),
                'pending_payments_count': pending_payments_count,
            },
            'inventory_distribution': inventory_distribution,
            'monthly_activity': monthly_activity,
        }

        return Response(response_data)
