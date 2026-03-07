from django.contrib import admin

from . import models


@admin.register(models.StakeholderProfile)
class StakeholderProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'role', 'organization', 'phone', 'kyc_status', 'created_at']
    list_filter = ['role', 'kyc_status', 'created_at']
    search_fields = ['user__username', 'organization', 'phone']


@admin.register(models.KYCRecord)
class KYCRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'profile', 'document_type', 'document_number', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['profile__user__username', 'document_number']


@admin.register(models.CropBatch)
class CropBatchAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'product_batch_id', 'crop_type', 'quantity', 'status',
        'farm_location', 'farmer_base_price_per_unit',
        'distributor_margin_per_unit', 'current_owner', 'created_at'
    ]
    list_filter = ['status', 'crop_type', 'created_at']
    search_fields = ['product_batch_id', 'crop_type', 'farm_location']


@admin.register(models.TransportRequest)
class TransportRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'batch', 'from_party', 'to_party',
        'transporter', 'status', 'transporter_fee_per_unit', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['batch__product_batch_id', 'from_party__user__username', 'to_party__user__username']


@admin.register(models.InspectionReport)
class InspectionReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'batch', 'distributor', 'passed', 'inspected_at']
    list_filter = ['passed', 'inspected_at']
    search_fields = ['batch__product_batch_id']


@admin.register(models.BatchSplit)
class BatchSplitAdmin(admin.ModelAdmin):
    list_display = ['id', 'parent_batch', 'split_label', 'quantity', 'destination_retailer', 'created_at']
    list_filter = ['created_at']
    search_fields = ['parent_batch__product_batch_id', 'split_label']


@admin.register(models.RetailListing)
class RetailListingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'batch', 'retailer', 'farmer_base_price',
        'transport_fees', 'distributor_margin', 'retailer_margin',
        'total_price', 'is_for_sale', 'created_at'
    ]
    list_filter = ['is_for_sale', 'created_at']
    search_fields = ['batch__product_batch_id', 'retailer__user__username']


@admin.register(models.ConsumerScan)
class ConsumerScanAdmin(admin.ModelAdmin):
    list_display = ['id', 'listing', 'scanned_at']
    list_filter = ['scanned_at']
    search_fields = ['listing__batch__product_batch_id']


@admin.register(models.BatchEvent)
class BatchEventAdmin(admin.ModelAdmin):
    list_display = ['id', 'batch', 'event_type', 'performed_by', 'timestamp']
    list_filter = ['event_type', 'timestamp']
    search_fields = ['batch__product_batch_id', 'performed_by__username']
    readonly_fields = ['timestamp']
