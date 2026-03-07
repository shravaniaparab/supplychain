from django.conf import settings
from django.db import models
from django.utils import timezone
from .db_file_fields import DatabaseFileField, DatabaseImageField


class StakeholderRole(models.TextChoices):
    FARMER = "farmer", "Farmer"
    TRANSPORTER = "transporter", "Transporter"
    DISTRIBUTOR = "distributor", "Distributor"
    RETAILER = "retailer", "Retailer"
    CONSUMER = "consumer", "Consumer"
    ADMIN = "admin", "Admin"


class KYCStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class StakeholderProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=32, choices=StakeholderRole.choices)
    organization = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.TextField(blank=True)
    wallet_id = models.CharField(max_length=255, blank=True)
    kyc_status = models.CharField(
        max_length=32, choices=KYCStatus.choices, default=KYCStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"


class KYCRecord(models.Model):
    profile = models.ForeignKey(
        StakeholderProfile, on_delete=models.CASCADE, related_name="kyc_records"
    )
    document_type = models.CharField(max_length=100)
    document_number = models.CharField(max_length=255)
    document_file = DatabaseFileField(blank=True, null=True)
    status = models.CharField(
        max_length=32, choices=KYCStatus.choices, default=KYCStatus.PENDING
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_kyc_records",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.profile.user.username} - {self.document_type}"


class BatchStatus(models.TextChoices):
    CREATED = "CREATED", "Created"
    TRANSPORT_REQUESTED = "TRANSPORT_REQUESTED", "Transport Requested"
    IN_TRANSIT_TO_DISTRIBUTOR = "IN_TRANSIT_TO_DISTRIBUTOR", "In Transit to Distributor"
    ARRIVED_AT_DISTRIBUTOR = "ARRIVED_AT_DISTRIBUTOR", "Arrived at Distributor"
    ARRIVAL_CONFIRMED_BY_DISTRIBUTOR = "ARRIVAL_CONFIRMED_BY_DISTRIBUTOR", "Arrival Confirmed by Distributor"
    DELIVERED_TO_DISTRIBUTOR = "DELIVERED_TO_DISTRIBUTOR", "Delivered to Distributor"
    STORED = "STORED", "Stored"
    TRANSPORT_REQUESTED_TO_RETAILER = "TRANSPORT_REQUESTED_TO_RETAILER", "Transport Requested to Retailer"
    IN_TRANSIT_TO_RETAILER = "IN_TRANSIT_TO_RETAILER", "In Transit to Retailer"
    ARRIVED_AT_RETAILER = "ARRIVED_AT_RETAILER", "Arrived at Retailer"
    ARRIVAL_CONFIRMED_BY_RETAILER = "ARRIVAL_CONFIRMED_BY_RETAILER", "Arrival Confirmed by Retailer"
    DELIVERED_TO_RETAILER = "DELIVERED_TO_RETAILER", "Delivered to Retailer"
    LISTED = "LISTED", "Listed for Sale"
    SOLD = "SOLD", "Sold"
    TRANSPORT_REJECTED = "TRANSPORT_REJECTED", "Transport Rejected"
    SUSPENDED = "SUSPENDED", "Suspended"
    FULLY_SPLIT = "FULLY_SPLIT", "Fully Split"


class FinancialStatus(models.TextChoices):
    PAYMENT_PENDING = "PAYMENT_PENDING", "Payment Pending"
    DISTRIBUTOR_PHASE_SETTLED = "DISTRIBUTOR_PHASE_SETTLED", "Distributor Phase Settled"
    RETAILER_PHASE_SETTLED = "RETAILER_PHASE_SETTLED", "Retailer Phase Settled"


class BatchPhase(models.TextChoices):
    DISTRIBUTOR_PHASE = "DISTRIBUTOR_PHASE", "Distributor Phase"
    RETAILER_PHASE = "RETAILER_PHASE", "Retailer Phase"


class CropBatch(models.Model):
    farmer = models.ForeignKey(
        StakeholderProfile, on_delete=models.PROTECT, related_name="crop_batches"
    )
    # New Fields for Stabilization
    current_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_batches",
    )
    status = models.CharField(
        max_length=32, choices=BatchStatus.choices, default=BatchStatus.CREATED
    )
    farm_location = models.CharField(max_length=255, blank=True)
    
    # Track if this is a child batch from splitting
    is_child_batch = models.BooleanField(default=False)
    parent_batch = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='child_batches'
    )

    crop_type = models.CharField(max_length=120)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    harvest_date = models.DateField()
    product_batch_id = models.CharField(max_length=100, unique=True, blank=True)
    public_batch_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    qr_code_image = DatabaseImageField(blank=True, null=True)
    qr_code_data = models.TextField(blank=True)
    organic_certificate = DatabaseFileField(blank=True, null=True)
    quality_test_report = DatabaseFileField(blank=True, null=True)
    
    # Linear Pricing Fields
    farmer_base_price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    distributor_margin_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Financial State Machine Fields
    financial_status = models.CharField(
        max_length=32, choices=FinancialStatus.choices, blank=True, default=''
    )
    current_phase = models.CharField(
        max_length=32, choices=BatchPhase.choices, blank=True, default=''
    )
    is_locked = models.BooleanField(default=False)

    # Payment Status Fields
    farmer_payment_status = models.CharField(max_length=20, default="PENDING")
    transporter_payment_status = models.CharField(max_length=20, default="PENDING")
    distributor_payment_status = models.CharField(max_length=20, default="PENDING")
    retailer_payment_to_transporter_status = models.CharField(max_length=20, default="PENDING")
    # Additional payment fields existing in database
    distributor_payment_to_farmer_status = models.CharField(max_length=20, default="PENDING")
    distributor_payment_to_transporter_status = models.CharField(max_length=20, default="PENDING")
    farmer_payment_to_transporter_status = models.CharField(max_length=20, default="PENDING")
    retailer_payment_to_distributor_status = models.CharField(max_length=20, default="PENDING")
    distributor_payment_to_transporter_retailer_phase_status = models.CharField(max_length=20, default="PENDING")
    
    anchored_snapshot_hash = models.CharField(max_length=66, blank=True, default="")
    anchor_tx_hash = models.CharField(max_length=66, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.product_batch_id:
            import uuid
            import datetime

            self.product_batch_id = f"BATCH-{datetime.datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        if not self.public_batch_id:
            import uuid
            self.public_batch_id = str(uuid.uuid4())
        
        # Auto-set owner to farmer's user if not set
        if not self.current_owner and self.farmer:
            self.current_owner = self.farmer.user
            
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.product_batch_id} ({self.status})"


class BatchEventType(models.TextChoices):
    CREATED = "CREATED", "Batch Created"
    TRANSPORT_REQUESTED = "TRANSPORT_REQUESTED", "Transport Requested"
    TRANSPORT_ACCEPTED = "TRANSPORT_ACCEPTED", "Transport Accepted"
    TRANSPORT_STARTED = "TRANSPORT_STARTED", "Transport Started"
    ARRIVED_AT_DISTRIBUTOR = "ARRIVED_AT_DISTRIBUTOR", "Arrived at Distributor"
    ARRIVAL_CONFIRMED_BY_DISTRIBUTOR = "ARRIVAL_CONFIRMED_BY_DISTRIBUTOR", "Arrival Confirmed by Distributor"
    DELIVERED_TO_DISTRIBUTOR = "DELIVERED_TO_DISTRIBUTOR", "Delivered to Distributor"
    STORED = "STORED", "Stored by Distributor"
    INSPECTED = "INSPECTED", "Inspected"
    INSPECTION_PASSED = "INSPECTION_PASSED", "Inspection Passed"
    INSPECTION_FAILED = "INSPECTION_FAILED", "Inspection Failed"
    TRANSPORT_REQUESTED_TO_RETAILER = "TRANSPORT_REQUESTED_TO_RETAILER", "Transport Requested to Retailer"
    IN_TRANSIT_TO_RETAILER = "IN_TRANSIT_TO_RETAILER", "In Transit to Retailer"
    ARRIVED_AT_RETAILER = "ARRIVED_AT_RETAILER", "Arrived at Retailer"
    ARRIVAL_CONFIRMED_BY_RETAILER = "ARRIVAL_CONFIRMED_BY_RETAILER", "Arrival Confirmed by Retailer"
    DELIVERED_TO_RETAILER = "DELIVERED_TO_RETAILER", "Delivered to Retailer"
    LISTED = "LISTED", "Listed for Retail"
    SOLD = "SOLD", "Sold to Consumer"
    TRANSPORT_REJECTED = "TRANSPORT_REJECTED", "Transport Rejected"
    SUSPENDED = "SUSPENDED", "Batch Suspended"
    FULLY_SPLIT = "FULLY_SPLIT", "Batch Fully Split"


class BatchEvent(models.Model):
    """
    Immutable event log for batch history.
    Prepares for blockchain integration.
    """
    batch = models.ForeignKey(
        CropBatch, on_delete=models.CASCADE, related_name="events"
    )
    event_type = models.CharField(max_length=32, choices=BatchEventType.choices)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="batch_events"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['batch', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.batch.product_batch_id} - {self.event_type} at {self.timestamp}"


class Certificate(models.Model):
    batch = models.ForeignKey(CropBatch, on_delete=models.CASCADE)
    certificate_type = models.CharField(max_length=120)
    document_reference = models.CharField(max_length=255)
    issued_at = models.DateField(null=True, blank=True)


class TransportRequest(models.Model):
    batch = models.ForeignKey(
        CropBatch, on_delete=models.CASCADE, related_name="transport_requests"
    )
    requested_by = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="requested_transports",
    )
    from_party = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="outgoing_transports",
    )
    to_party = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="incoming_transports",
    )
    transporter = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="assigned_transports",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=32, default="PENDING")
    vehicle_details = models.TextField(blank=True)
    driver_details = models.TextField(blank=True)
    pickup_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_proof = DatabaseFileField(blank=True, null=True)
    
    # Linear Pricing Fields
    transporter_fee_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Transport {self.batch.product_batch_id}"


class TransportLeg(models.Model):
    request = models.ForeignKey(TransportRequest, on_delete=models.CASCADE)
    transporter = models.ForeignKey(StakeholderProfile, on_delete=models.PROTECT)
    vehicle_details = models.TextField(blank=True)
    driver_details = models.TextField(blank=True)
    pickup_time = models.DateTimeField(null=True, blank=True)
    delivery_time = models.DateTimeField(null=True, blank=True)
    delivery_proof_reference = models.CharField(max_length=255, blank=True)


class InspectionResult(models.TextChoices):
    PASS = "PASS", "Pass"
    WARNING = "WARNING", "Warning"
    FAIL = "FAIL", "Fail"


class InspectionStage(models.TextChoices):
    FARMER = "farmer", "Farmer"
    DISTRIBUTOR = "distributor", "Distributor"
    RETAILER = "retailer", "Retailer"


class InspectionReport(models.Model):
    batch = models.ForeignKey(
        CropBatch, on_delete=models.CASCADE, related_name="inspection_reports"
    )
    stage = models.CharField(
        max_length=32, choices=InspectionStage.choices, default=InspectionStage.FARMER
    )
    inspection_notes = models.TextField(blank=True)
    result = models.CharField(
        max_length=32, choices=InspectionResult.choices, default=InspectionResult.PASS
    )
    report_file = DatabaseFileField(blank=True, null=True)
    # Legacy field - kept for backward compatibility
    storage_conditions = models.TextField(blank=True)
    passed = models.BooleanField(default=False)
    # New created_by field (replaces distributor field for general use)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="inspections_created",
        null=True,
        blank=True,
    )
    # Keep distributor field for backward compatibility
    distributor = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="inspections_conducted",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(default=timezone.now)
    inspected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Inspection {self.batch.product_batch_id} - {self.stage}"


class BatchSplit(models.Model):
    parent_batch = models.ForeignKey(
        CropBatch, on_delete=models.CASCADE, related_name="splits"
    )
    split_label = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    destination_retailer = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="received_splits",
        null=True,
        blank=True,
    )
    child_batch = models.ForeignKey(
        CropBatch,
        on_delete=models.CASCADE,
        related_name="child_of_split",
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.parent_batch.product_batch_id} - {self.split_label}"


class RetailListing(models.Model):
    batch = models.ForeignKey(
        CropBatch, on_delete=models.PROTECT, related_name="retail_listings"
    )
    retailer = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="listings",
    )
    # Quantity fields for proper inventory tracking
    total_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remaining_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    units_sold = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Pricing fields
    farmer_base_price = models.DecimalField(max_digits=12, decimal_places=2)
    transport_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    distributor_margin = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    retailer_margin = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Revenue tracking
    total_revenue_generated = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_for_sale = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_price(self) -> float:
        """Total price per unit (selling price)"""
        return float(
            self.farmer_base_price
            + self.transport_fees
            + self.distributor_margin
            + self.retailer_margin
        )

    @property
    def is_sold_out(self) -> bool:
        """Check if all inventory is sold"""
        return self.remaining_quantity <= 0 and self.units_sold > 0

    def save(self, *args, **kwargs):
        # Auto-set selling_price_per_unit from total_price if not set
        if self.selling_price_per_unit == 0:
            self.selling_price_per_unit = self.total_price
        # Auto-set quantities from batch if not set
        if self.total_quantity == 0 and self.batch:
            self.total_quantity = self.batch.quantity
        if self.remaining_quantity == 0 and self.total_quantity > 0:
            self.remaining_quantity = self.total_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.batch.product_batch_id} at {self.retailer.organization}"


class ConsumerScan(models.Model):
    listing = models.ForeignKey(
        RetailListing, on_delete=models.CASCADE, related_name="scans"
    )
    scanned_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"Scan {self.listing.batch.product_batch_id}"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION", "Awaiting Confirmation"
    SETTLED = "SETTLED", "Settled"


class PaymentType(models.TextChoices):
    BATCH_PAYMENT = "BATCH_PAYMENT", "Batch Payment"
    TRANSPORT_SHARE = "TRANSPORT_SHARE", "Transport Share"


class Payment(models.Model):
    """
    Payment records for batch transactions.
    Role-agnostic table - filtering happens at query level.
    """
    batch = models.ForeignKey(
        CropBatch, on_delete=models.CASCADE, related_name="payments"
    )
    payer = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="payments_made",
    )
    payee = models.ForeignKey(
        StakeholderProfile,
        on_delete=models.PROTECT,
        related_name="payments_received",
    )
    payer_role = models.CharField(max_length=32, choices=StakeholderRole.choices)
    payee_role = models.CharField(max_length=32, choices=StakeholderRole.choices)
    payment_type = models.CharField(
        max_length=32, choices=PaymentType.choices, default=PaymentType.BATCH_PAYMENT
    )
    phase = models.CharField(
        max_length=32, choices=BatchPhase.choices, blank=True, default=''
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=32, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    payee_upi_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payer', 'status']),
            models.Index(fields=['payee', 'status']),
            models.Index(fields=['batch', 'status']),
        ]

    def __str__(self) -> str:
        return f"Payment {self.id} - {self.batch.product_batch_id} - {self.status}"


# Later phase: After all payments declared, generate SHA256 hash and push to blockchain module.
