from django.contrib.auth import get_user_model
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import models, serializers
from .blockchain_service import anchor_batch_to_blockchain
from .event_logger import log_batch_event
from .models import BatchEventType, BatchStatus
from .view_utils import raise_if_locked

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = serializers.UserSerializer


class StakeholderProfileViewSet(viewsets.ModelViewSet):
    queryset = models.StakeholderProfile.objects.select_related("user").all()
    serializer_class = serializers.StakeholderProfileSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ["organization", "user__username"]
    filterset_fields = ["role", "kyc_status"]


class KYCRecordViewSet(viewsets.ModelViewSet):
    queryset = models.KYCRecord.objects.select_related("profile", "verified_by").all()
    serializer_class = serializers.KYCRecordSerializer


class CropBatchViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.CropBatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            profile = user.stakeholderprofile
        except Exception:
            return models.CropBatch.objects.none()

        if profile.role == models.StakeholderRole.ADMIN:
            return models.CropBatch.objects.all()

        return models.CropBatch.objects.filter(
            Q(current_owner=user) | Q(farmer=profile)
        ).distinct()

    def perform_create(self, serializer):
        profile = self.request.user.stakeholderprofile
        farm_location = self.request.data.get("farm_location") or profile.address

        batch = serializer.save(
            farmer=profile,
            farm_location=farm_location,
        )

        log_batch_event(
            batch=batch,
            event_type=BatchEventType.CREATED,
            user=self.request.user,
            metadata={
                "crop_type": batch.crop_type,
                "quantity": str(batch.quantity),
                "harvest_date": batch.harvest_date.isoformat(),
            },
        )

        try:
            result = anchor_batch_to_blockchain(batch, context="BATCH_CREATED")
            batch.anchored_snapshot_hash = result["snapshot_hash"]
            batch.anchor_tx_hash = result["tx_hash"]
            batch.save(update_fields=["anchored_snapshot_hash", "anchor_tx_hash"])
        except Exception as e:
            print("Blockchain anchoring failed:", str(e))

        return batch


class TransportRequestViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.TransportRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            profile = user.stakeholderprofile
        except Exception:
            return models.TransportRequest.objects.none()

        if profile.role == models.StakeholderRole.ADMIN:
            return models.TransportRequest.objects.all()

        if profile.role == models.StakeholderRole.TRANSPORTER:
            return models.TransportRequest.objects.filter(
                Q(status="PENDING") | Q(transporter=profile)
            )

        return models.TransportRequest.objects.filter(
            Q(requested_by=profile) |
            Q(from_party=profile) |
            Q(to_party=profile)
        ).distinct()


class InspectionReportViewSet(viewsets.ModelViewSet):
    queryset = models.InspectionReport.objects.select_related(
        "batch", "created_by", "distributor"
    ).all()
    serializer_class = serializers.InspectionReportSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        try:
            profile = user.stakeholderprofile
        except models.StakeholderProfile.DoesNotExist:
            return models.InspectionReport.objects.none()

        if profile.role == models.StakeholderRole.ADMIN:
            return models.InspectionReport.objects.all()

        return models.InspectionReport.objects.filter(
            Q(batch__farmer=profile)
            | Q(batch__transport_requests__transporter=profile)
            | Q(batch__transport_requests__from_party=profile)
            | Q(batch__transport_requests__to_party=profile)
            | Q(batch__current_owner=user)
            | Q(created_by=user)
        ).distinct()

    def _get_user_stage(self, profile):
        stage_map = {
            models.StakeholderRole.FARMER: models.InspectionStage.FARMER,
            models.StakeholderRole.DISTRIBUTOR: models.InspectionStage.DISTRIBUTOR,
            models.StakeholderRole.RETAILER: models.InspectionStage.RETAILER,
        }
        return stage_map.get(profile.role)

    def _can_inspect_at_stage(self, profile, batch, stage):
        role = profile.role
        batch_status = batch.status

        if role == models.StakeholderRole.FARMER and stage == models.InspectionStage.FARMER:
            return batch.farmer == profile and batch_status == models.BatchStatus.CREATED

        if role == models.StakeholderRole.DISTRIBUTOR and stage == models.InspectionStage.DISTRIBUTOR:
            return (
                batch_status in [
                    models.BatchStatus.ARRIVED_AT_DISTRIBUTOR,
                    models.BatchStatus.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR,
                    models.BatchStatus.DELIVERED_TO_DISTRIBUTOR,
                    models.BatchStatus.STORED,
                ]
                and models.TransportRequest.objects.filter(
                    batch=batch,
                    to_party=profile,
                    status__in=["ARRIVAL_CONFIRMED", "DELIVERED"],
                ).exists()
            )

        if role == models.StakeholderRole.RETAILER and stage == models.InspectionStage.RETAILER:
            return (
                batch_status in [
                    models.BatchStatus.ARRIVED_AT_RETAILER,
                    models.BatchStatus.ARRIVAL_CONFIRMED_BY_RETAILER,
                    models.BatchStatus.DELIVERED_TO_RETAILER,
                    models.BatchStatus.LISTED,
                ]
                and models.TransportRequest.objects.filter(
                    batch=batch,
                    to_party=profile,
                    status__in=["ARRIVAL_CONFIRMED", "DELIVERED"],
                ).exists()
            )

        return False

    def perform_create(self, serializer):
        user = self.request.user
        try:
            profile = user.stakeholderprofile
        except models.StakeholderProfile.DoesNotExist:
            raise ValidationError("User profile not found")

        stage = self.request.data.get("stage")
        if not stage:
            stage = self._get_user_stage(profile)
            if not stage:
                raise ValidationError("Cannot determine inspection stage for your role")

        expected_stage = self._get_user_stage(profile)
        if stage != expected_stage:
            raise ValidationError(
                f"As a {profile.role}, you can only create inspections for stage: {expected_stage}"
            )

        batch_id = self.request.data.get("batch")
        if not batch_id:
            raise ValidationError("Batch ID is required")

        try:
            batch = models.CropBatch.objects.get(id=batch_id)
        except models.CropBatch.DoesNotExist:
            raise ValidationError("Batch not found")

        if not self._can_inspect_at_stage(profile, batch, stage):
            raise ValidationError(
                f"You are not authorized to perform inspection at '{stage}' stage for this batch"
            )

        result = self.request.data.get("result", models.InspectionResult.PASS)
        passed = result == models.InspectionResult.PASS

        inspection = serializer.save(
            created_by=user,
            distributor=profile if profile.role == models.StakeholderRole.DISTRIBUTOR else None,
            stage=stage,
            passed=passed,
        )

        event_type = (
            models.BatchEventType.INSPECTION_PASSED
            if passed
            else models.BatchEventType.INSPECTION_FAILED
        )

        log_batch_event(
            batch=batch,
            event_type=event_type,
            user=user,
            metadata={
                "stage": stage,
                "result": result,
                "inspection_id": inspection.id,
            },
        )

        return inspection

    @action(detail=False, methods=["get"], url_path="batch/(?P<batch_id>[^/.]+)")
    def batch_timeline(self, request, batch_id=None):
        try:
            try:
                batch = models.CropBatch.objects.get(id=batch_id)
            except (models.CropBatch.DoesNotExist, ValueError):
                batch = models.CropBatch.objects.get(product_batch_id=batch_id)
        except models.CropBatch.DoesNotExist:
            return Response({"error": "Batch not found"}, status=status.HTTP_404_NOT_FOUND)

        inspections = models.InspectionReport.objects.filter(batch=batch).order_by("created_at")

        data = []
        for inspection in inspections:
            data.append(
                {
                    "stage": inspection.stage,
                    "result": inspection.result,
                    "inspection_notes": inspection.inspection_notes,
                    "created_by": inspection.created_by.username if inspection.created_by else None,
                    "created_at": inspection.created_at.isoformat(),
                    "report_file": inspection.report_file.url if inspection.report_file else None,
                }
            )

        return Response(data)


class BatchSplitViewSet(viewsets.ModelViewSet):
    queryset = models.BatchSplit.objects.select_related(
        "parent_batch", "destination_retailer"
    ).all()
    serializer_class = serializers.BatchSplitSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        parent_batch = serializer.validated_data["parent_batch"]

        if parent_batch.status == BatchStatus.SUSPENDED:
            raise ValidationError("This batch has been suspended and cannot proceed further.")

        raise_if_locked(parent_batch)

        quantity = serializer.validated_data.get("quantity", 0)

        import uuid

        child_batch = models.CropBatch.objects.create(
            product_batch_id=f"BATCH-{uuid.uuid4().hex[:8].upper()}",
            crop_type=parent_batch.crop_type,
            quantity=quantity,
            farm_location=parent_batch.farm_location,
            farmer=parent_batch.farmer,
            current_owner=self.request.user,
            status=models.BatchStatus.STORED,
            harvest_date=parent_batch.harvest_date,
            is_child_batch=True,
            parent_batch=parent_batch,
            farmer_base_price_per_unit=parent_batch.farmer_base_price_per_unit,
            distributor_margin_per_unit=parent_batch.distributor_margin_per_unit,
        )

        serializer.save(child_batch=child_batch)


class RetailListingViewSet(viewsets.ModelViewSet):
    queryset = models.RetailListing.objects.select_related("batch", "retailer").all()
    serializer_class = serializers.RetailListingSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        try:
            retailer_profile = self.request.user.stakeholderprofile
            if retailer_profile.role != models.StakeholderRole.RETAILER:
                raise ValidationError("Only retailers can create listings")

            batch = serializer.validated_data.get("batch")
            if not batch:
                raise ValidationError("Batch is required")

            if batch.status == BatchStatus.SUSPENDED:
                raise ValidationError("This batch has been suspended and cannot proceed further.")

            raise_if_locked(batch)

            farmer_base_price = batch.farmer_base_price_per_unit
            distributor_margin = batch.distributor_margin_per_unit

            transport_fees = 0
            current_lookup_batch = batch
            while current_lookup_batch:
                batch_transports = models.TransportRequest.objects.filter(
                    batch=current_lookup_batch,
                    status="DELIVERED",
                )
                for tr in batch_transports:
                    transport_fees += tr.transporter_fee_per_unit

                current_lookup_batch = current_lookup_batch.parent_batch

            retailer_margin = serializer.validated_data.get("retailer_margin", 0)

            listing = serializer.save(
                retailer=retailer_profile,
                farmer_base_price=farmer_base_price,
                transport_fees=transport_fees,
                distributor_margin=distributor_margin,
                retailer_margin=retailer_margin,
            )

            try:
                batch = listing.batch
                batch.status = models.BatchStatus.LISTED
                batch.save()

                from .utils import generate_batch_qr
                generate_batch_qr(batch)

                log_batch_event(
                    batch=batch,
                    event_type=models.BatchEventType.LISTED,
                    user=self.request.user,
                    metadata={
                        "retailer": retailer_profile.organization,
                        "price": str(listing.total_price),
                    },
                )
            except Exception as e:
                print(f"ERROR in RetailListingViewSet.perform_create: {str(e)}")

        except models.StakeholderProfile.DoesNotExist:
            raise ValidationError("Retailer profile not found")


class ConsumerScanViewSet(viewsets.ModelViewSet):
    queryset = models.ConsumerScan.objects.select_related("listing").all()
    serializer_class = serializers.ConsumerScanSerializer
    permission_classes = [IsAuthenticated]