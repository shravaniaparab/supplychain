"""
Retailer Dashboard Views
Provides analytics and metrics specific to the logged-in retailer.
"""
from django.db.models import Count, Sum, Q, F
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from . import models
from .models import StakeholderRole, CropBatch, TransportRequest, RetailListing


class RetailerDashboardView(APIView):
    """
    Returns retailer-specific analytics including:
    - Metrics (incoming shipments, inventory value, listings, revenue)
    - Inventory distribution for doughnut chart
    - Monthly sales for bar chart
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Verify user is a retailer
        try:
            profile = request.user.stakeholderprofile
            if profile.role != StakeholderRole.RETAILER:
                return Response(
                    {"error": "Only retailers can access this dashboard"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- METRICS SECTION ---
        
        # Incoming Shipments: Transport requests to retailer not yet delivered
        incoming_shipments = TransportRequest.objects.filter(
            to_party=profile
        ).exclude(
            status__in=['DELIVERED', 'REJECTED']
        ).count()

        # Get retailer's listings
        retailer_listings = RetailListing.objects.filter(retailer=profile)
        
        # Total Active Listings (listings with remaining_quantity > 0)
        active_listings = retailer_listings.filter(
            is_for_sale=True,
            remaining_quantity__gt=0
        ).count()
        
        # Inventory Value: sum(remaining_quantity × selling_price_per_unit)
        # Only count active listings with remaining stock
        inventory_value_result = retailer_listings.filter(
            is_for_sale=True,
            remaining_quantity__gt=0
        ).aggregate(
            total=Sum(F('remaining_quantity') * F('selling_price_per_unit'))
        )
        inventory_value = float(inventory_value_result['total'] or 0)

        # Total Sales Revenue: sum(total_revenue_generated) - only from actual sales
        revenue_result = retailer_listings.filter(
            units_sold__gt=0
        ).aggregate(
            total=Sum('total_revenue_generated')
        )
        total_sales_revenue = float(revenue_result['total'] or 0)
        
        # Units sold: sum(units_sold) - total quantity sold, not count of listings
        units_result = retailer_listings.filter(
            units_sold__gt=0
        ).aggregate(
            total=Sum('units_sold')
        )
        units_sold = float(units_result['total'] or 0)

        # --- INVENTORY DISTRIBUTION (for Doughnut Chart) ---
        # Group active listings by crop type with remaining_quantity as value
        inventory_by_crop = retailer_listings.filter(
            is_for_sale=True,
            remaining_quantity__gt=0
        ).select_related('batch').values(
            'batch__crop_type'
        ).annotate(
            count=Count('id'),
            total_quantity=Sum('remaining_quantity'),
            total_value=Sum(F('remaining_quantity') * F('selling_price_per_unit'))
        ).order_by('-total_value')

        inventory_distribution = {}
        for item in inventory_by_crop:
            crop = item['batch__crop_type'] or 'Unknown'
            inventory_distribution[crop] = {
                'count': item['count'],
                'quantity': float(item['total_quantity'] or 0),
                'value': float(item['total_value'] or 0)
            }

        # --- MONTHLY SALES (for Bar Chart) ---
        # Note: We don't have monthly breakdown by sale date yet
        # For now, we'll aggregate total revenue by listing creation month
        # In production, you'd want a separate SalesTransaction model
        twelve_months_ago = timezone.now() - timezone.timedelta(days=365)
        
        # Get monthly data - grouping by listing creation month
        # This is a simplified view - true monthly sales would require tracking each sale date
        monthly_sales = retailer_listings.filter(
            units_sold__gt=0,
            created_at__gte=twelve_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            revenue=Sum('total_revenue_generated'),
            units=Sum('units_sold')
        ).order_by('month')

        # Build monthly sales map
        months_set = set()
        revenue_map = {}
        units_map = {}
        
        for item in monthly_sales:
            if item['month']:
                month_key = item['month'].strftime('%b')
                months_set.add(month_key)
                revenue_map[month_key] = float(item['revenue'] or 0)
                units_map[month_key] = float(item['units'] or 0)

        # Sort months chronologically
        month_order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        sorted_months = sorted(months_set, key=lambda x: month_order.index(x) if x in month_order else 99)

        monthly_sales_data = {
            'months': sorted_months,
            'revenue': [revenue_map.get(m, 0) for m in sorted_months],
            'units': [units_map.get(m, 0) for m in sorted_months],
        }

        # --- PAYMENT-DERIVED FINANCIAL METRICS ---
        from .models import Payment, PaymentStatus as PS, PaymentType as PT, StakeholderRole as SR
        
        paid_to_distributor = Payment.objects.filter(
            payer=profile, payee_role=SR.DISTRIBUTOR, status=PS.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        paid_transport = Payment.objects.filter(
            payer=profile, payment_type=PT.TRANSPORT_SHARE, status=PS.SETTLED
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        payment_pending_count = Payment.objects.filter(
            payer=profile, status=PS.PENDING
        ).count()

        # Build response
        response_data = {
            'metrics': {
                'incoming_shipments': incoming_shipments,
                'inventory_value': round(inventory_value, 2),
                'active_listings': active_listings,
                'total_sales_revenue': round(total_sales_revenue, 2),
                'units_sold': round(units_sold, 2),
            },
            'financial': {
                'paid_to_distributor': float(paid_to_distributor),
                'paid_transport': float(paid_transport),
                'pending_payments_count': payment_pending_count,
            },
            'inventory_distribution': inventory_distribution,
            'monthly_sales': monthly_sales_data,
        }

        return Response(response_data)
