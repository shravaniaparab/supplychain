# Generated migration for RetailListing quantity fields
from django.db import migrations, models
from decimal import Decimal


def initialize_retail_listing_quantities(apps, schema_editor):
    """
    Initialize new quantity fields for existing RetailListing records.
    - total_quantity = batch.quantity
    - remaining_quantity = batch.quantity (if is_for_sale else 0)
    - selling_price_per_unit = total_price property value
    - units_sold = 0
    - total_revenue_generated = 0
    """
    RetailListing = apps.get_model('supplychain', 'RetailListing')
    
    for listing in RetailListing.objects.all():
        # Set quantities from batch
        if listing.batch:
            listing.total_quantity = listing.batch.quantity
            # If listing is not for sale, assume all sold
            if not listing.is_for_sale:
                listing.remaining_quantity = Decimal('0')
                listing.units_sold = listing.batch.quantity
            else:
                listing.remaining_quantity = listing.batch.quantity
        
        # Set selling price from total_price calculation
        total_price = (
            listing.farmer_base_price
            + listing.transport_fees
            + listing.distributor_margin
            + listing.retailer_margin
        )
        listing.selling_price_per_unit = total_price
        
        listing.save(update_fields=[
            'total_quantity', 'remaining_quantity', 'selling_price_per_unit',
            'units_sold', 'total_revenue_generated'
        ])


class Migration(migrations.Migration):
    dependencies = [
        ('supplychain', '0011_cropbatch_distributor_margin_per_unit_and_more'),
    ]

    operations = [
        # Add new fields to RetailListing
        migrations.AddField(
            model_name='retaillisting',
            name='total_quantity',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='retaillisting',
            name='remaining_quantity',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='retaillisting',
            name='units_sold',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='retaillisting',
            name='selling_price_per_unit',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='retaillisting',
            name='total_revenue_generated',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        # Run data migration to initialize values
        migrations.RunPython(initialize_retail_listing_quantities, reverse_code=migrations.RunPython.noop),
    ]
