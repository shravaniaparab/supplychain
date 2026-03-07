from django.contrib import admin

from supplychain import models


@admin.register(models.StakeholderProfile)
class StakeholderProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "phone", "wallet_id")
    search_fields = ("user__username", "phone", "wallet_id")
    list_filter = ("role",)


@admin.register(models.KYCRecord)
class KYCRecordAdmin(admin.ModelAdmin):
    list_display = ("profile", "document_type", "status", "verified_at")
    list_filter = ("status",)
    search_fields = ("profile__user__username", "document_type")


@admin.register(models.CropBatch)
class CropBatchAdmin(admin.ModelAdmin):
    list_display = ("crop_type", "product_batch_id", "harvest_date", "created_at")
    search_fields = ("crop_type", "product_batch_id")


@admin.register(models.TransportRequest)
class TransportRequestAdmin(admin.ModelAdmin):
    list_display = ("batch", "status", "requested_by", "transporter")
    list_filter = ("status",)


@admin.register(models.InspectionReport)
class InspectionReportAdmin(admin.ModelAdmin):
    list_display = ("batch", "distributor", "passed", "inspected_at")
    list_filter = ("passed",)


@admin.register(models.BatchSplit)
class BatchSplitAdmin(admin.ModelAdmin):
    list_display = ("parent_batch", "split_label", "destination_retailer")


@admin.register(models.RetailListing)
class RetailListingAdmin(admin.ModelAdmin):
    list_display = ("batch", "retailer", "is_for_sale", "created_at")
    list_filter = ("is_for_sale",)


@admin.register(models.ConsumerScan)
class ConsumerScanAdmin(admin.ModelAdmin):
    list_display = ("listing", "scanned_at")
