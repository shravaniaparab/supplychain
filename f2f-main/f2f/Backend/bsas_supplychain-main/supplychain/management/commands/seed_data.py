"""
Comprehensive seed data management command for AgriSupplyChain.

Creates 3 stakeholder ecosystems with 15 batches covering full lifecycle.
"""
import os
import io
import uuid
import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from supplychain import models
from supplychain.event_logger import log_batch_event, log_ownership_transfer
from supplychain.utils import generate_batch_qr
from supplychain.batch_validators import BatchStatusTransitionValidator

User = get_user_model()

# Constants
CROP_TYPES = ["Wheat", "Rice", "Corn", "Soybeans", "Barley", "Oats", "Potatoes", "Tomatoes", "Apples", "Mangoes"]
FARM_LOCATIONS = [
    "Green Valley Farm, Punjab",
    "Sunrise Orchards, Haryana",
    "Golden Fields Estate, UP",
    "Riverbend Farms, Bihar",
    "Highland Agriculture, MP",
    "Sunny Meadows, Gujarat",
    "Prairie View Farm, Rajasthan",
    "Harvest Haven, Maharashtra",
    "Fertile Fields, Karnataka",
    "Nature's Bounty, Tamil Nadu"
]

DOCUMENT_TYPES = ["Aadhaar Card", "PAN Card", "Passport", "Driver's License", "Voter ID"]

# Batch configuration for 15 batches across 3 sets
# Format: (target_status, needs_full_lifecycle, needs_listing, needs_sale, needs_suspension)
BATCH_CONFIG_SET1 = [
    (models.BatchStatus.SOLD, True, True, True, False),           # Batch 1 -> SOLD (full lifecycle)
    (models.BatchStatus.LISTED, True, True, False, False),          # Batch 2 -> LISTED
    (models.BatchStatus.DELIVERED_TO_RETAILER, True, False, False, False),  # Batch 3 -> DELIVERED_TO_RETAILER
    (models.BatchStatus.STORED, True, False, False, False),         # Batch 4 -> STORED
    (models.BatchStatus.SUSPENDED, False, False, False, True),      # Batch 5 -> SUSPENDED (farmer suspends)
]

BATCH_CONFIG_SET2 = [
    (models.BatchStatus.LISTED, True, True, False, False),          # Batch 6 -> LISTED
    (models.BatchStatus.IN_TRANSIT_TO_RETAILER, True, False, False, False),  # Batch 7 -> IN_TRANSIT_TO_RETAILER
    (models.BatchStatus.DELIVERED_TO_DISTRIBUTOR, True, False, False, False),  # Batch 8 -> DELIVERED_TO_DISTRIBUTOR
    (models.BatchStatus.TRANSPORT_REQUESTED, False, False, False, False),     # Batch 9 -> TRANSPORT_REQUESTED
    (models.BatchStatus.CREATED, False, False, False, False),       # Batch 10 -> CREATED
]

BATCH_CONFIG_SET3 = [
    (models.BatchStatus.STORED, True, False, False, False),         # Batch 11 -> STORED
    (models.BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR, True, False, False, False),  # Batch 12 -> IN_TRANSIT_TO_DISTRIBUTOR
    (models.BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER, True, False, False, False),  # Batch 13 -> TRANSPORT_REQUESTED_TO_RETAILER
    (models.BatchStatus.DELIVERED_TO_RETAILER, True, False, False, False),  # Batch 14 -> DELIVERED_TO_RETAILER
    (models.BatchStatus.SUSPENDED, False, False, False, True),      # Batch 15 -> SUSPENDED (distributor suspends)
]


class Command(BaseCommand):
    help = "Seed database with 3 stakeholder ecosystems and 15 batches with full lifecycle coverage"

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing seed data before creating new data',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting comprehensive seed data creation..."))

        with transaction.atomic():
            if options['reset']:
                self.reset_seed_data()

            # SECTION 1: Admin Creation
            admin = self.create_admin()

            # SECTION 2: Create 3 Stakeholder Sets
            sets_data = []
            for i in range(3, 6):  # 03, 04, 05
                set_users = self.create_stakeholder_set(i, admin)
                sets_data.append(set_users)
                self.stdout.write(self.style.SUCCESS(f"Created Set {i-2}: farmer{i:02d}, transporter{i:02d}, distributor{i:02d}, retailer{i:02d}, consumer{i:02d}"))

            # SECTION 3-5: Create 15 batches with lifecycle coverage
            batch_counter = 1
            all_batches = []

            # Set 1 batches
            for config in BATCH_CONFIG_SET1:
                batch = self.create_batch_with_lifecycle(
                    sets_data[0], batch_counter, config, is_sold_batch=(batch_counter == 1)
                )
                all_batches.append(batch)
                batch_counter += 1

            # Set 2 batches
            for config in BATCH_CONFIG_SET2:
                batch = self.create_batch_with_lifecycle(
                    sets_data[1], batch_counter, config, is_sold_batch=False
                )
                all_batches.append(batch)
                batch_counter += 1

            # Set 3 batches
            for config in BATCH_CONFIG_SET3:
                batch = self.create_batch_with_lifecycle(
                    sets_data[2], batch_counter, config, is_sold_batch=False
                )
                all_batches.append(batch)
                batch_counter += 1

            # SECTION 6: Create inspections for all batches
            for batch in all_batches:
                self.create_inspections_for_batch(batch, sets_data)

        # Final validation summary
        self.print_summary()

    def reset_seed_data(self):
        """Delete existing seed data."""
        self.stdout.write(self.style.WARNING("Resetting seed data..."))

        # Delete batches first (cascade will handle related objects)
        models.CropBatch.objects.filter(
            product_batch_id__startswith="SEED-BATCH-"
        ).delete()

        # Delete users
        for i in range(3, 6):
            for role in ['farmer', 'transporter', 'distributor', 'retailer', 'consumer']:
                username = f"{role}{i:02d}"
                User.objects.filter(username=username).delete()

        self.stdout.write(self.style.SUCCESS("Reset complete"))

    def create_dummy_file(self, filename, content=b"Dummy file content for seed data"):
        """Create a dummy file for uploads."""
        return ContentFile(content, name=filename)

    def create_admin(self):
        """SECTION 1: Create admin user if not exists."""
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'is_superuser': True,
                'is_staff': True,
                'email': 'admin@agrichain.com',
                'first_name': 'System',
                'last_name': 'Administrator'
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS("Created admin user (admin/admin123)"))
        else:
            # Ensure admin has correct permissions
            admin.is_superuser = True
            admin.is_staff = True
            admin.save()
            self.stdout.write(self.style.NOTICE("Admin user already exists"))

        return admin

    def create_stakeholder_set(self, set_num, admin_user):
        """
        SECTION 2: Create one stakeholder set with strict naming pattern.
        Returns dict with all user objects.
        """
        roles = ['farmer', 'transporter', 'distributor', 'retailer', 'consumer']
        users = {}

        for role in roles:
            username = f"{role}{set_num:02d}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f"{username}@agrichain.com",
                    'first_name': role.capitalize(),
                    'last_name': f"User {set_num:02d}"
                }
            )

            if created:
                user.set_password('password123')
                user.save()

            # Get or create StakeholderProfile
            profile, p_created = models.StakeholderProfile.objects.get_or_create(
                user=user,
                defaults={
                    'role': role,
                    'organization': f"{role.capitalize()} Org {set_num:02d}",
                    'phone': f"+91-{set_num:02d}{random.randint(10000000, 99999999)}",
                    'address': f"Address for {role} {set_num:02d}",
                    'wallet_id': f"0x{uuid.uuid4().hex[:40]}",
                    'kyc_status': models.KYCStatus.APPROVED
                }
            )

            if not p_created:
                # Update existing profile
                profile.role = role
                profile.wallet_id = profile.wallet_id or f"0x{uuid.uuid4().hex[:40]}"
                profile.kyc_status = models.KYCStatus.APPROVED
                profile.save()

            # Create KYCRecord with document
            kyc_doc_type = random.choice(DOCUMENT_TYPES)
            kyc_doc_number = f"DOC-{set_num:02d}-{uuid.uuid4().hex[:8].upper()}"

            # Create dummy file
            dummy_file = self.create_dummy_file(f"kyc_{username}.pdf")

            kyc_record, k_created = models.KYCRecord.objects.get_or_create(
                profile=profile,
                document_type=kyc_doc_type,
                defaults={
                    'document_number': kyc_doc_number,
                    'status': models.KYCStatus.APPROVED,
                    'verified_by': admin_user,
                    'verified_at': timezone.now()
                }
            )

            if k_created:
                kyc_record.document_file.save(f"kyc_{username}.pdf", dummy_file, save=True)
            elif not kyc_record.document_file:
                kyc_record.document_file.save(f"kyc_{username}.pdf", dummy_file, save=True)

            users[role] = {
                'user': user,
                'profile': profile
            }

        return users

    def create_batch_with_lifecycle(self, stakeholder_set, batch_num, config, is_sold_batch=False):
        """
        Create a batch and progress it through its lifecycle to the target status.
        config: (target_status, needs_full_lifecycle, needs_listing, needs_sale, needs_suspension)
        """
        target_status, needs_full_lifecycle, needs_listing, needs_sale, needs_suspension = config

        farmer = stakeholder_set['farmer']['profile']
        farmer_user = stakeholder_set['farmer']['user']
        distributor = stakeholder_set['distributor']['profile']
        distributor_user = stakeholder_set['distributor']['user']
        transporter = stakeholder_set['transporter']['profile']
        transporter_user = stakeholder_set['transporter']['user']
        retailer = stakeholder_set['retailer']['profile']
        retailer_user = stakeholder_set['retailer']['user']
        consumer = stakeholder_set['consumer']['profile']
        consumer_user = stakeholder_set['consumer']['user']

        crop_type = random.choice(CROP_TYPES)
        quantity = Decimal(str(random.randint(50, 500)))
        harvest_date = timezone.now().date() - timedelta(days=random.randint(30, 90))
        farm_location = random.choice(FARM_LOCATIONS)

        # Create batch with deterministic product_batch_id
        product_batch_id = f"SEED-BATCH-{batch_num:03d}-{uuid.uuid4().hex[:8].upper()}"

        batch, created = models.CropBatch.objects.get_or_create(
            product_batch_id=product_batch_id,
            defaults={
                'farmer': farmer,
                'current_owner': farmer_user,
                'crop_type': crop_type,
                'quantity': quantity,
                'harvest_date': harvest_date,
                'farm_location': farm_location,
                'farmer_base_price_per_unit': Decimal(str(random.uniform(10, 50))),
                'status': models.BatchStatus.CREATED
            }
        )

        if not created:
            # Reset batch to CREATED for consistent seeding
            batch.status = models.BatchStatus.CREATED
            batch.current_owner = farmer_user
            batch.save()
            # Clear existing events
            models.BatchEvent.objects.filter(batch=batch).delete()
            models.TransportRequest.objects.filter(batch=batch).delete()
            models.InspectionReport.objects.filter(batch=batch).delete()
            models.RetailListing.objects.filter(batch=batch).delete()

        # Log creation event
        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.CREATED,
            user=farmer_user,
            metadata={'crop_type': crop_type, 'quantity': str(quantity)}
        )

        self.stdout.write(f"  Batch {batch_num:03d}: {crop_type} ({quantity}kg) -> Target: {target_status}")

        # Progress through lifecycle based on target status
        if target_status == models.BatchStatus.CREATED:
            # Just created, no further action
            pass

        elif target_status == models.BatchStatus.SUSPENDED:
            # Determine who suspends based on config
            if batch_num == 5:  # Farmer suspends at CREATED
                self.suspend_batch(batch, farmer_user, stakeholder_set['farmer']['profile'])
            elif batch_num == 15:  # Distributor suspends at STORED
                # First progress to STORED
                self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)
                self.store_batch(batch, distributor_user)
                self.suspend_batch(batch, distributor_user, stakeholder_set['distributor']['profile'])

        elif target_status == models.BatchStatus.TRANSPORT_REQUESTED:
            # Progress to transport requested
            self.request_transport_to_distributor(batch, farmer_user, farmer, distributor)

        elif target_status == models.BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR:
            # Progress to in transit
            self.request_transport_to_distributor(batch, farmer_user, farmer, distributor)
            self.accept_transport(batch, transporter_user, transporter, to_distributor=True)

        elif target_status == models.BatchStatus.DELIVERED_TO_DISTRIBUTOR:
            # Progress to delivered to distributor
            self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)

        elif target_status == models.BatchStatus.STORED:
            # Progress to stored
            self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)
            self.store_batch(batch, distributor_user)

        elif target_status == models.BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER:
            # Progress to transport requested to retailer
            self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)
            self.store_batch(batch, distributor_user)
            self.request_transport_to_retailer(batch, distributor_user, distributor, retailer)

        elif target_status == models.BatchStatus.IN_TRANSIT_TO_RETAILER:
            # Progress to in transit to retailer
            self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)
            self.store_batch(batch, distributor_user)
            self.request_transport_to_retailer(batch, distributor_user, distributor, retailer)
            self.accept_transport(batch, transporter_user, transporter, to_distributor=False)

        elif target_status == models.BatchStatus.DELIVERED_TO_RETAILER:
            # Progress to delivered to retailer
            self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)
            self.store_batch(batch, distributor_user)
            self.full_transport_to_retailer(batch, stakeholder_set, distributor_user, transporter_user, retailer_user)

        elif target_status == models.BatchStatus.LISTED:
            # Progress to listed
            self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)
            self.store_batch(batch, distributor_user)
            self.full_transport_to_retailer(batch, stakeholder_set, distributor_user, transporter_user, retailer_user)
            self.list_batch(batch, retailer_user, retailer, quantity)

        elif target_status == models.BatchStatus.SOLD:
            # Full lifecycle to sold
            self.full_transport_to_distributor(batch, stakeholder_set, farmer_user, transporter_user, distributor_user)
            self.store_batch(batch, distributor_user)
            self.full_transport_to_retailer(batch, stakeholder_set, distributor_user, transporter_user, retailer_user)
            listing = self.list_batch(batch, retailer_user, retailer, quantity)
            self.sell_batch(batch, retailer_user, retailer, listing, quantity)

        return batch

    def request_transport_to_distributor(self, batch, farmer_user, farmer, distributor):
        """Create transport request from farmer to distributor."""
        transport_request, created = models.TransportRequest.objects.get_or_create(
            batch=batch,
            from_party=farmer,
            to_party=distributor,
            defaults={
                'requested_by': farmer,
                'status': 'PENDING'
            }
        )

        batch.status = models.BatchStatus.TRANSPORT_REQUESTED
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.TRANSPORT_REQUESTED,
            user=farmer_user,
            metadata={'distributor': distributor.user.username, 'transport_request_id': transport_request.id}
        )

        return transport_request

    def accept_transport(self, batch, transporter_user, transporter, to_distributor=True):
        """Transporter accepts transport request."""
        transport_request = models.TransportRequest.objects.filter(batch=batch).latest('created_at')

        transport_request.transporter = transporter
        transport_request.transporter_fee_per_unit = Decimal(str(random.uniform(1, 5)))
        transport_request.status = 'ACCEPTED'
        transport_request.save()

        if to_distributor:
            batch.status = models.BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR
        else:
            batch.status = models.BatchStatus.IN_TRANSIT_TO_RETAILER
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.TRANSPORT_ACCEPTED,
            user=transporter_user,
            metadata={'transport_request_id': transport_request.id}
        )

    def mark_arrival(self, batch, transporter_user, transporter, at_distributor=True):
        """Transporter marks arrival at destination."""
        transport_request = models.TransportRequest.objects.filter(batch=batch).latest('created_at')

        transport_request.status = 'ARRIVED'
        transport_request.save()

        if at_distributor:
            batch.status = models.BatchStatus.ARRIVED_AT_DISTRIBUTOR
            event_type = models.BatchEventType.ARRIVED_AT_DISTRIBUTOR
        else:
            batch.status = models.BatchStatus.ARRIVED_AT_RETAILER
            event_type = models.BatchEventType.ARRIVED_AT_RETAILER
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=event_type,
            user=transporter_user,
            metadata={'transport_request_id': transport_request.id}
        )

    def confirm_arrival(self, batch, receiver_user, receiver_profile, is_distributor=True):
        """Receiver confirms arrival."""
        transport_request = models.TransportRequest.objects.filter(batch=batch).latest('created_at')

        transport_request.status = 'ARRIVAL_CONFIRMED'
        transport_request.save()

        if is_distributor:
            batch.status = models.BatchStatus.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR
            event_type = models.BatchEventType.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR
        else:
            batch.status = models.BatchStatus.ARRIVAL_CONFIRMED_BY_RETAILER
            event_type = models.BatchEventType.ARRIVAL_CONFIRMED_BY_RETAILER
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=event_type,
            user=receiver_user,
            metadata={'transport_request_id': transport_request.id}
        )

    def deliver_batch(self, batch, transporter_user, transporter, to_user, to_profile, to_distributor=True):
        """Transporter marks delivery complete and ownership transfers."""
        transport_request = models.TransportRequest.objects.filter(batch=batch).latest('created_at')

        transport_request.status = 'DELIVERED'
        transport_request.delivered_at = timezone.now()
        transport_request.save()

        if to_distributor:
            batch.status = models.BatchStatus.DELIVERED_TO_DISTRIBUTOR
            event_type = models.BatchEventType.DELIVERED_TO_DISTRIBUTOR
        else:
            batch.status = models.BatchStatus.DELIVERED_TO_RETAILER
            event_type = models.BatchEventType.DELIVERED_TO_RETAILER

        # Transfer ownership
        from_user = batch.current_owner
        batch.current_owner = to_profile.user
        batch.save()

        log_ownership_transfer(
            batch=batch,
            from_user=from_user,
            to_user=to_profile.user,
            event_type=event_type,
            user_performing_action=transporter_user,
            reason=f"Delivery to {to_profile.role} confirmed by transporter"
        )

    def full_transport_to_distributor(self, batch, stakeholder_set, farmer_user, transporter_user, distributor_user):
        """Complete full transport cycle to distributor."""
        farmer = stakeholder_set['farmer']['profile']
        distributor = stakeholder_set['distributor']['profile']
        transporter = stakeholder_set['transporter']['profile']

        # Request transport
        self.request_transport_to_distributor(batch, farmer_user, farmer, distributor)
        # Accept transport
        self.accept_transport(batch, transporter_user, transporter, to_distributor=True)
        # Mark arrival
        self.mark_arrival(batch, transporter_user, transporter, at_distributor=True)
        # Confirm arrival
        self.confirm_arrival(batch, distributor_user, distributor, is_distributor=True)
        # Mark delivered
        self.deliver_batch(batch, transporter_user, transporter, distributor_user, distributor, to_distributor=True)

    def store_batch(self, batch, distributor_user):
        """Distributor stores the batch."""
        batch.status = models.BatchStatus.STORED
        batch.distributor_margin_per_unit = Decimal(str(random.uniform(5, 15)))
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.STORED,
            user=distributor_user,
            metadata={}
        )

    def request_transport_to_retailer(self, batch, distributor_user, distributor, retailer):
        """Create transport request from distributor to retailer."""
        transport_request, created = models.TransportRequest.objects.get_or_create(
            batch=batch,
            from_party=distributor,
            to_party=retailer,
            defaults={
                'requested_by': distributor,
                'status': 'PENDING'
            }
        )

        batch.status = models.BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.TRANSPORT_REQUESTED_TO_RETAILER,
            user=distributor_user,
            metadata={'retailer': retailer.user.username, 'transport_request_id': transport_request.id}
        )

        return transport_request

    def full_transport_to_retailer(self, batch, stakeholder_set, distributor_user, transporter_user, retailer_user):
        """Complete full transport cycle to retailer."""
        distributor = stakeholder_set['distributor']['profile']
        retailer = stakeholder_set['retailer']['profile']
        transporter = stakeholder_set['transporter']['profile']

        # Request transport
        self.request_transport_to_retailer(batch, distributor_user, distributor, retailer)
        # Accept transport
        self.accept_transport(batch, transporter_user, transporter, to_distributor=False)
        # Mark arrival
        self.mark_arrival(batch, transporter_user, transporter, at_distributor=False)
        # Confirm arrival
        self.confirm_arrival(batch, retailer_user, retailer, is_distributor=False)
        # Mark delivered
        self.deliver_batch(batch, transporter_user, transporter, retailer_user, retailer, to_distributor=False)

    def list_batch(self, batch, retailer_user, retailer, quantity):
        """Retailer lists batch for sale."""
        # Calculate pricing
        farmer_base = batch.farmer_base_price_per_unit
        distributor_margin = batch.distributor_margin_per_unit

        # Get transport fees
        transport_fees = Decimal('0')
        for tr in models.TransportRequest.objects.filter(batch=batch, status='DELIVERED'):
            transport_fees += tr.transporter_fee_per_unit

        retailer_margin = Decimal(str(random.uniform(5, 20)))

        listing, created = models.RetailListing.objects.get_or_create(
            batch=batch,
            retailer=retailer,
            defaults={
                'farmer_base_price': farmer_base,
                'transport_fees': transport_fees,
                'distributor_margin': distributor_margin,
                'retailer_margin': retailer_margin,
                'selling_price_per_unit': farmer_base + transport_fees + distributor_margin + retailer_margin,
                'total_quantity': quantity,
                'remaining_quantity': quantity,
                'units_sold': Decimal('0'),
                'total_revenue_generated': Decimal('0'),
                'is_for_sale': True
            }
        )

        if not created:
            listing.total_quantity = quantity
            listing.remaining_quantity = quantity
            listing.is_for_sale = True
            listing.save()

        batch.status = models.BatchStatus.LISTED
        batch.save()

        # Generate QR code
        generate_batch_qr(batch)

        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.LISTED,
            user=retailer_user,
            metadata={'retailer': retailer.organization, 'price': str(listing.total_price)}
        )

        return listing

    def sell_batch(self, batch, retailer_user, retailer, listing, quantity):
        """Mark batch as sold."""
        sale_revenue = quantity * listing.selling_price_per_unit

        listing.remaining_quantity = Decimal('0')
        listing.units_sold = quantity
        listing.total_revenue_generated = sale_revenue
        listing.is_for_sale = False
        listing.save()

        batch.status = models.BatchStatus.SOLD
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.SOLD,
            user=retailer_user,
            metadata={
                'sold_quantity': float(quantity),
                'sale_revenue': float(sale_revenue),
                'remaining_quantity': 0,
                'is_fully_sold': True
            }
        )

    def suspend_batch(self, batch, user, profile):
        """Suspend a batch."""
        batch.status = models.BatchStatus.SUSPENDED
        batch.save()

        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.SUSPENDED,
            user=user,
            metadata={'suspended_by_role': profile.role, 'suspended_by': user.username}
        )

    def create_inspections_for_batch(self, batch, all_sets):
        """SECTION 6: Create at least 2 inspection logs per batch."""
        # Find the appropriate stakeholders for inspections based on batch status
        sets_map = {5: all_sets[0], 10: all_sets[1], 15: all_sets[2]}  # batch_num -> set

        # Determine which set this batch belongs to
        batch_num = int(batch.product_batch_id.split('-')[2])
        if batch_num <= 5:
            stakeholder_set = all_sets[0]
        elif batch_num <= 10:
            stakeholder_set = all_sets[1]
        else:
            stakeholder_set = all_sets[2]

        # Create farmer inspection (always at CREATED stage)
        farmer = stakeholder_set['farmer']['profile']
        farmer_user = stakeholder_set['farmer']['user']

        # Determine results - ensure at least 1 FAIL across all batches
        # Batch 3 and 13 will have one FAIL each
        is_fail_batch = batch_num in [3, 13]

        # First inspection - Farmer stage
        result1 = models.InspectionResult.FAIL if is_fail_batch else models.InspectionResult.PASS
        self.create_inspection(batch, farmer, farmer_user, models.InspectionStage.FARMER, result1)

        # Second inspection - depends on batch status
        if batch.status in [models.BatchStatus.CREATED, models.BatchStatus.TRANSPORT_REQUESTED, models.BatchStatus.SUSPENDED]:
            # Only farmer inspection needed
            self.create_inspection(batch, farmer, farmer_user, models.InspectionStage.FARMER, models.InspectionResult.WARNING)

        elif batch.status in [
            models.BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR,
            models.BatchStatus.ARRIVED_AT_DISTRIBUTOR,
            models.BatchStatus.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR,
            models.BatchStatus.DELIVERED_TO_DISTRIBUTOR,
            models.BatchStatus.STORED,
            models.BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER,
            models.BatchStatus.SUSPENDED
        ]:
            # Add distributor inspection
            distributor = stakeholder_set['distributor']['profile']
            distributor_user = stakeholder_set['distributor']['user']
            result2 = models.InspectionResult.WARNING if not is_fail_batch else models.InspectionResult.PASS
            self.create_inspection(batch, distributor, distributor_user, models.InspectionStage.DISTRIBUTOR, result2)

        elif batch.status in [
            models.BatchStatus.IN_TRANSIT_TO_RETAILER,
            models.BatchStatus.ARRIVED_AT_RETAILER,
            models.BatchStatus.ARRIVAL_CONFIRMED_BY_RETAILER,
            models.BatchStatus.DELIVERED_TO_RETAILER,
            models.BatchStatus.LISTED,
            models.BatchStatus.SOLD
        ]:
            # Add distributor and retailer inspections
            distributor = stakeholder_set['distributor']['profile']
            distributor_user = stakeholder_set['distributor']['user']
            result2 = models.InspectionResult.PASS
            self.create_inspection(batch, distributor, distributor_user, models.InspectionStage.DISTRIBUTOR, result2)

            retailer = stakeholder_set['retailer']['profile']
            retailer_user = stakeholder_set['retailer']['user']
            result3 = models.InspectionResult.PASS
            self.create_inspection(batch, retailer, retailer_user, models.InspectionStage.RETAILER, result3)

    def create_inspection(self, batch, inspector_profile, inspector_user, stage, result):
        """Create an inspection report."""
        # Create dummy report file
        dummy_file = self.create_dummy_file(f"inspection_{batch.id}_{stage}.pdf")

        passed = result == models.InspectionResult.PASS

        inspection, created = models.InspectionReport.objects.get_or_create(
            batch=batch,
            stage=stage,
            created_by=inspector_user,
            defaults={
                'result': result,
                'passed': passed,
                'inspection_notes': f"Inspection at {stage} stage. Result: {result}",
                'distributor': inspector_profile if inspector_profile.role == models.StakeholderRole.DISTRIBUTOR else None
            }
        )

        if created and result != models.InspectionResult.FAIL:
            inspection.report_file.save(f"inspection_{batch.id}_{stage}.pdf", dummy_file, save=True)

        # Log inspection event
        event_type = models.BatchEventType.INSPECTION_PASSED if passed else models.BatchEventType.INSPECTION_FAILED
        log_batch_event(
            batch=batch,
            event_type=event_type,
            user=inspector_user,
            metadata={'stage': stage, 'result': result, 'inspection_id': inspection.id}
        )

    def print_summary(self):
        """Print final validation summary."""
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "="*60))
        self.stdout.write(self.style.MIGRATE_HEADING("SEED DATA SUMMARY"))
        self.stdout.write(self.style.MIGRATE_HEADING("="*60))

        # Count stakeholders
        total_users = User.objects.filter(username__regex=r'^(farmer|transporter|distributor|retailer|consumer)\d{2}$').count()
        self.stdout.write(f"\n** Stakeholders Created: {total_users} **")
        for role in ['farmer', 'transporter', 'distributor', 'retailer', 'consumer']:
            count = models.StakeholderProfile.objects.filter(role=role, user__username__regex=rf'^{role}\d{{2}}$').count()
            self.stdout.write(f"  - {role.capitalize()}s: {count}")

        # Count batches by status
        self.stdout.write(f"\n** Batches by Status: **")
        for status_choice in models.BatchStatus:
            count = models.CropBatch.objects.filter(status=status_choice).count()
            marker = " <-- TARGET" if status_choice in [
                models.BatchStatus.SOLD,
                models.BatchStatus.LISTED,
                models.BatchStatus.SUSPENDED,
                models.BatchStatus.CREATED,
                models.BatchStatus.TRANSPORT_REQUESTED,
                models.BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR,
                models.BatchStatus.DELIVERED_TO_DISTRIBUTOR,
                models.BatchStatus.STORED,
                models.BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER,
                models.BatchStatus.IN_TRANSIT_TO_RETAILER,
                models.BatchStatus.DELIVERED_TO_RETAILER,
            ] else ""
            if count > 0 or status_choice == models.BatchStatus.SOLD:
                self.stdout.write(f"  - {status_choice.label}: {count}{marker}")

        # Verify SOLD count
        sold_count = models.CropBatch.objects.filter(status=models.BatchStatus.SOLD).count()
        if sold_count == 1:
            self.stdout.write(self.style.SUCCESS(f"\n✓ Exactly ONE batch is SOLD (correct)"))
        else:
            self.stdout.write(self.style.ERROR(f"\n✗ ERROR: {sold_count} batches are SOLD (expected 1)"))

        # Verify KYC
        approved_kyc = models.KYCRecord.objects.filter(status=models.KYCStatus.APPROVED).count()
        self.stdout.write(f"\n** KYC Records: {approved_kyc} approved **")

        # Verify inspections
        inspection_count = models.InspectionReport.objects.count()
        self.stdout.write(f"** Inspection Reports: {inspection_count} **")

        # Verify listings
        listing_count = models.RetailListing.objects.count()
        self.stdout.write(f"** Retail Listings: {listing_count} **")

        # Verify events
        event_count = models.BatchEvent.objects.count()
        self.stdout.write(f"** Batch Events: {event_count} **")

        # Verify QR codes
        batches_with_qr = models.CropBatch.objects.filter(qr_code_image__isnull=False).exclude(qr_code_image='').count()
        self.stdout.write(f"** Batches with QR Codes: {batches_with_qr} **")

        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "="*60))
        self.stdout.write(self.style.SUCCESS("Seed data creation complete!"))
        self.stdout.write(self.style.MIGRATE_HEADING("="*60))

        self.stdout.write("\nAdmin credentials: admin / admin123")
        self.stdout.write("Stakeholder credentials: farmer03-05, transporter03-05, etc. / password123")
