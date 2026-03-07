"""
Transporter Dashboard Views
Provides analytics and metrics specific to the logged-in transporter.
"""
from django.db.models import Count, Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from . import models
from .models import StakeholderRole, TransportRequest


class TransporterDashboardView(APIView):
    """
    Returns transporter-specific analytics including:
    - Metrics (shipment counts, earnings)
    - Status distribution for doughnut chart
    - Earnings overview for bar chart
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Verify user is a transporter
        try:
            profile = request.user.stakeholderprofile
            if profile.role != StakeholderRole.TRANSPORTER:
                return Response(
                    {"error": "Only transporters can access this dashboard"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all transport requests assigned to this transporter
        transporter_requests = TransportRequest.objects.filter(transporter=profile)

        # --- METRICS SECTION ---
        # Count by requester role (farmer vs distributor)
        farmer_shipments = transporter_requests.filter(
            from_party__role=StakeholderRole.FARMER
        ).count()

        distributor_shipments = transporter_requests.filter(
            from_party__role=StakeholderRole.DISTRIBUTOR
        ).count()

        # In Transit: Accepted or any transit-related status
        in_transit_statuses = ['ACCEPTED', 'IN_TRANSIT', 'IN_TRANSIT_TO_RETAILER', 'ARRIVED', 'ARRIVAL_CONFIRMED']
        in_transit = transporter_requests.filter(
            status__in=in_transit_statuses
        ).count()

        # Completed: Delivered status
        completed = transporter_requests.filter(status='DELIVERED').count()

        # Total Earnings: Sum of transporter_fee_per_unit for delivered shipments
        total_earnings_result = transporter_requests.filter(
            status='DELIVERED'
        ).aggregate(total=Sum('transporter_fee_per_unit'))
        total_earnings = float(total_earnings_result['total'] or 0)

        # --- STATUS DISTRIBUTION (for Doughnut Chart) ---
        # Aggregate counts by status
        status_counts = transporter_requests.values('status').annotate(count=Count('id'))
        
        # Initialize with 0 for all relevant statuses
        status_distribution = {
            'Accepted': 0,
            'In Transit': 0,
            'Arrived': 0,
            'Delivered': 0,
            'Completed': 0,  # Maps to DELIVERED for chart purposes
        }

        for item in status_counts:
            s = item['status']
            count = item['count']
            if s == 'ACCEPTED':
                status_distribution['Accepted'] += count
            elif s in ['IN_TRANSIT', 'IN_TRANSIT_TO_RETAILER']:
                status_distribution['In Transit'] += count
            elif s == 'ARRIVED':
                status_distribution['Arrived'] += count
            elif s == 'ARRIVAL_CONFIRMED':
                # Arrival confirmed counts toward arrived
                status_distribution['Arrived'] += count
            elif s == 'DELIVERED':
                status_distribution['Delivered'] += count
                status_distribution['Completed'] += count

        # Total deliveries for center of doughnut
        total_deliveries = transporter_requests.count()

        # --- EARNINGS OVERVIEW (for Bar Chart) ---
        # Earnings from farmer shipments
        farmer_earnings_result = transporter_requests.filter(
            status='DELIVERED',
            from_party__role=StakeholderRole.FARMER
        ).aggregate(total=Sum('transporter_fee_per_unit'))
        farmer_earnings = float(farmer_earnings_result['total'] or 0)

        # Earnings from distributor shipments
        distributor_earnings_result = transporter_requests.filter(
            status='DELIVERED',
            from_party__role=StakeholderRole.DISTRIBUTOR
        ).aggregate(total=Sum('transporter_fee_per_unit'))
        distributor_earnings = float(distributor_earnings_result['total'] or 0)

        earnings_overview = {
            'farmer_earnings': farmer_earnings,
            'distributor_earnings': distributor_earnings,
            'total_earnings': total_earnings,
        }

        # --- MONTHLY ACTIVITY TREND (Optional Line Chart Data) ---
        from django.db.models.functions import TruncMonth
        from django.utils import timezone
        
        # Get monthly shipment counts for the last 12 months
        twelve_months_ago = timezone.now() - timezone.timedelta(days=365)
        monthly_activity = transporter_requests.filter(
            created_at__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')

        monthly_trend = {}
        for item in monthly_activity:
            if item['month']:
                month_key = item['month'].strftime('%b %Y')
                monthly_trend[month_key] = item['count']

        # --- PAYMENT-DERIVED FINANCIAL METRICS ---
        from .models import Payment, PaymentStatus as PS
        
        payment_earnings = Payment.objects.filter(
            payee=profile, status=PS.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        payment_pending_count = Payment.objects.filter(
            payee=profile
        ).exclude(status=PS.SETTLED).count()

        # Build response
        response_data = {
            'metrics': {
                'farmer_shipments': farmer_shipments,
                'distributor_shipments': distributor_shipments,
                'in_transit': in_transit,
                'completed': completed,
                'total_earnings': total_earnings,
            },
            'financial': {
                'total_earnings': float(payment_earnings),
                'pending_count': payment_pending_count,
            },
            'status_distribution': status_distribution,
            'total_deliveries': total_deliveries,
            'earnings_overview': earnings_overview,
            'monthly_trend': monthly_trend,
        }

        return Response(response_data)
