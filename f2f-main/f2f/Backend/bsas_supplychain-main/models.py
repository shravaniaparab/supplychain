from uuid import uuid4

from django.conf import settings
from django.db import models


class StakeholderProfile(models.Model):
    class Role(models.TextChoices):
        FARMER = "FARMER", "Farmer"
        TRANSPORTER = "TRANSPORTER", "Transporter"
        DISTRIBUTOR = "DISTRIBUTOR", "Distributor"
        RETAILER = "RETAILER", "Retailer"
        CONSUMER = "CONSUMER", "Consumer"
        ADMIN = "ADMIN", "Admin"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=32, choices=Role.choices)
    phone = models.CharField(max_length=32, blank=True)
    wallet_id = models.CharField(max_length=128, blank=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"


class KYCRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    profile = models.ForeignKey(StakeholderProfile, on_delete=models.CASCADE)
    document_type = models.CharField(max_length=64)
    document_number = models.CharField(max_length=128, blank=True)
    document_file = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_kyc_records",
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.profile} - {self.document_type}"


class CropBatch(models.Model):
    farmer = models.ForeignKey(StakeholderProfile, on_delete=models.CASCADE)
    crop_type = models.CharField(max_length=64)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    harvest_date = models.DateField()
    organic_certificate = models.CharField(max_length=255, blank=True)
    quality_test_report = models.CharField(max_length=255, blank=True)
    product_batch_id = models.UUIDField(default=uuid4, unique=True, editable=False)
    qr_code_data = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.qr_code_data:
            self.qr_code_data = f"batch:{self.product_batch_id}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.crop_type} - {self.product_batch_id}"


class TransportRequest(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        ACCEPTED = "ACCEPTED", "Accepted"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        DELIVERED = "DELIVERED", "Delivered"

    batch = models.ForeignKey(CropBatch, on_delete=models.CASCADE)
    requested_by = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.CASCADE,
        related_name="transport_requests",
    )
    from_party = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.CASCADE,
        related_name="transport_from",
    )
    to_party = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.CASCADE,
        related_name="transport_to",
    )
    transporter = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_jobs",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    vehicle_details = models.TextField(blank=True)
    driver_details = models.TextField(blank=True)
    pickup_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_proof = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"{self.batch} ({self.status})"


class InspectionReport(models.Model):
    batch = models.ForeignKey(CropBatch, on_delete=models.CASCADE)
    distributor = models.ForeignKey(StakeholderProfile, on_delete=models.CASCADE)
    report_file = models.CharField(max_length=255, blank=True)
    storage_conditions = models.TextField(blank=True)
    passed = models.BooleanField(default=True)
    inspected_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Inspection for {self.batch}"


class BatchSplit(models.Model):
    parent_batch = models.ForeignKey(CropBatch, on_delete=models.CASCADE)
    split_label = models.CharField(max_length=64)
    destination_retailer = models.ForeignKey(StakeholderProfile, on_delete=models.CASCADE)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.parent_batch} -> {self.split_label}"


class RetailListing(models.Model):
    batch = models.ForeignKey(CropBatch, on_delete=models.CASCADE)
    retailer = models.ForeignKey(StakeholderProfile, on_delete=models.CASCADE)
    farmer_base_price = models.DecimalField(max_digits=12, decimal_places=2)
    transport_fees = models.DecimalField(max_digits=12, decimal_places=2)
    distributor_margin = models.DecimalField(max_digits=12, decimal_places=2)
    retailer_margin = models.DecimalField(max_digits=12, decimal_places=2)
    is_for_sale = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Listing {self.batch}"


class ConsumerScan(models.Model):
    listing = models.ForeignKey(RetailListing, on_delete=models.CASCADE)
    scanned_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"Scan {self.listing}"
