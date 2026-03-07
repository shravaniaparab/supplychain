"""
Payment views for managing payments across all stakeholder roles.
Backend-controlled financial state machine with manual UPI execution
and strict confirmation checkpoints.
"""
from django.db import transaction
from django.db.models import Q, Sum, Count
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.conf import settings

from . import models, serializers

def get_upi_id(payee):
    if getattr(settings, "PAYMENT_MODE", "demo") == "demo":
        return getattr(settings, "DEMO_UPI_ID", "hitenkhialani05@okhdfcbank")
    return payee.wallet_id or ""


class PaymentViewSet(ModelViewSet):
    """
    ViewSet for managing payments.
    Role-agnostic - users see payments where they are payer or payee.
    """
    serializer_class = serializers.PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            profile = user.stakeholderprofile
        except Exception:
            return models.Payment.objects.none()

        return models.Payment.objects.filter(
            Q(payer=profile) | Q(payee=profile)
        ).select_related('batch', 'payer__user', 'payee__user').order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Get payment summary statistics for the current user based on their role.
        All values derived from Payment model only, using SETTLED status.
        """
        try:
            profile = request.user.stakeholderprofile
        except Exception:
            return Response({"error": "User profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        role = profile.role

        if role == models.StakeholderRole.FARMER:
            total_received = models.Payment.objects.filter(
                payee=profile,
                payment_type=models.PaymentType.BATCH_PAYMENT,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            total_paid_transport = models.Payment.objects.filter(
                payer=profile,
                payment_type=models.PaymentType.TRANSPORT_SHARE,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            pending_confirmations = models.Payment.objects.filter(
                payee=profile,
                status=models.PaymentStatus.AWAITING_CONFIRMATION
            ).count()

            pending_to_pay = models.Payment.objects.filter(
                payer=profile,
                status=models.PaymentStatus.PENDING
            ).aggregate(total=Sum('amount'))['total'] or 0

            pending_to_receive = models.Payment.objects.filter(
                payee=profile,
                status=models.PaymentStatus.PENDING
            ).aggregate(total=Sum('amount'))['total'] or 0

            return Response({
                "role": "farmer",
                "total_received": float(total_received),
                "total_paid_transport": float(total_paid_transport),
                "net_amount": float(total_received - total_paid_transport),
                "pending_confirmations": pending_confirmations,
                "pending_to_receive": float(pending_to_receive),
                "pending_to_pay": float(pending_to_pay),
                "summary_cards": [
                    {"title": "Total Received", "value": float(total_received), "type": "positive"},
                    {"title": "Total Paid (Transport)", "value": float(total_paid_transport), "type": "negative"},
                    {"title": "Net Balance", "value": float(total_received - total_paid_transport), "type": "balance"},
                    {"title": "Pending Confirmations", "value": pending_confirmations, "type": "pending"},
                    {"title": "Pending to Pay", "value": float(pending_to_pay), "type": "pending"},
                ]
            })

        elif role == models.StakeholderRole.DISTRIBUTOR:
            total_paid_farmers = models.Payment.objects.filter(
                payer=profile,
                payee_role=models.StakeholderRole.FARMER,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            total_received_retailers = models.Payment.objects.filter(
                payee=profile,
                payer_role=models.StakeholderRole.RETAILER,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            total_paid_transport = models.Payment.objects.filter(
                payer=profile,
                payment_type=models.PaymentType.TRANSPORT_SHARE,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            pending_payments = models.Payment.objects.filter(
                payer=profile,
                status=models.PaymentStatus.PENDING
            ).aggregate(total=Sum('amount'))['total'] or 0

            pending_confirmations = models.Payment.objects.filter(
                payee=profile,
                status=models.PaymentStatus.AWAITING_CONFIRMATION
            ).count()

            return Response({
                "role": "distributor",
                "total_paid_to_farmers": float(total_paid_farmers),
                "total_received_from_retailers": float(total_received_retailers),
                "total_paid_transport": float(total_paid_transport),
                "pending_payments": float(pending_payments),
                "pending_confirmations": pending_confirmations,
                "summary_cards": [
                    {"title": "Received (Retailers)", "value": float(total_received_retailers), "type": "positive"},
                    {"title": "Paid to Farmers", "value": float(total_paid_farmers), "type": "negative"},
                    {"title": "Paid (Transport)", "value": float(total_paid_transport), "type": "negative"},
                    {"title": "Pending Payments", "value": float(pending_payments), "type": "pending"},
                    {"title": "Pending Confirmations", "value": pending_confirmations, "type": "pending"},
                ]
            })

        elif role == models.StakeholderRole.TRANSPORTER:
            total_earnings = models.Payment.objects.filter(
                payee=profile,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            pending_count = models.Payment.objects.filter(
                payee=profile,
                status__in=[models.PaymentStatus.PENDING, models.PaymentStatus.AWAITING_CONFIRMATION]
            ).count()

            settled_count = models.Payment.objects.filter(
                payee=profile,
                status=models.PaymentStatus.SETTLED
            ).count()

            pending_amount = models.Payment.objects.filter(
                payee=profile,
                status__in=[models.PaymentStatus.PENDING, models.PaymentStatus.AWAITING_CONFIRMATION]
            ).aggregate(total=Sum('amount'))['total'] or 0

            return Response({
                "role": "transporter",
                "total_earnings": float(total_earnings),
                "pending_count": pending_count,
                "settled_count": settled_count,
                "pending_amount": float(pending_amount),
                "summary_cards": [
                    {"title": "Total Earnings", "value": float(total_earnings), "type": "positive"},
                    {"title": "Pending Payments", "value": pending_count, "type": "pending"},
                    {"title": "Pending Amount", "value": float(pending_amount), "type": "pending"},
                    {"title": "Completed", "value": settled_count, "type": "count"},
                ]
            })

        elif role == models.StakeholderRole.RETAILER:
            total_paid_distributor = models.Payment.objects.filter(
                payer=profile,
                payee_role=models.StakeholderRole.DISTRIBUTOR,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            total_paid_transport = models.Payment.objects.filter(
                payer=profile,
                payment_type=models.PaymentType.TRANSPORT_SHARE,
                status=models.PaymentStatus.SETTLED
            ).aggregate(total=Sum('amount'))['total'] or 0

            pending_payments = models.Payment.objects.filter(
                payer=profile,
                status=models.PaymentStatus.PENDING
            ).aggregate(total=Sum('amount'))['total'] or 0

            pending_count = models.Payment.objects.filter(
                payer=profile,
                status=models.PaymentStatus.PENDING
            ).count()

            return Response({
                "role": "retailer",
                "total_paid_to_distributor": float(total_paid_distributor),
                "total_paid_transport": float(total_paid_transport),
                "pending_payments": float(pending_payments),
                "pending_count": pending_count,
                "summary_cards": [
                    {"title": "Paid to Distributors", "value": float(total_paid_distributor), "type": "negative"},
                    {"title": "Paid (Transport)", "value": float(total_paid_transport), "type": "negative"},
                    {"title": "Total Paid", "value": float(total_paid_distributor + total_paid_transport), "type": "negative"},
                    {"title": "Pending to Pay", "value": float(pending_payments), "type": "pending"},
                ]
            })

        return Response({"error": "Unknown role"}, status=status.HTTP_400_BAD_REQUEST)


class PaymentDeclareView(APIView):
    """
    Mark a payment as AWAITING_CONFIRMATION (payer has paid via UPI).
    Only the payer can declare.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            profile = request.user.stakeholderprofile
        except Exception:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = get_object_or_404(models.Payment, id=pk)

        if payment.payer != profile:
            return Response(
                {"success": False, "message": "Only the payer can declare payment"},
                status=status.HTTP_403_FORBIDDEN
            )

        if payment.status != models.PaymentStatus.PENDING:
            return Response(
                {"success": False, "message": f"Payment already {payment.status.lower()}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment.status = models.PaymentStatus.AWAITING_CONFIRMATION
        payment.save()

        return Response({
            "success": True,
            "message": "Payment marked as awaiting confirmation",
            "payment_id": payment.id,
            "status": payment.status
        })


class PaymentSettleView(APIView):
    """
    Mark a payment as SETTLED (payee confirms receipt).
    Only the payee can confirm. Triggers phase completion check.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            profile = request.user.stakeholderprofile
        except Exception:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment = get_object_or_404(models.Payment, id=pk)

        if payment.payee != profile:
            return Response(
                {"success": False, "message": "Only the payee can settle payment"},
                status=status.HTTP_403_FORBIDDEN
            )

        if payment.status != models.PaymentStatus.AWAITING_CONFIRMATION:
            return Response(
                {"success": False, "message": f"Payment must be awaiting confirmation before settling. Current: {payment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment.status = models.PaymentStatus.SETTLED
        payment.save()

        # Check if all payments for this phase are settled
        check_phase_completion(payment.batch)

        return Response({
            "success": True,
            "message": "Payment confirmed and settled",
            "payment_id": payment.id,
            "status": payment.status
        })


def check_phase_completion(batch):
    """
    Check if all payments for the current phase are SETTLED.
    If so, update batch financial_status and unlock the batch.
    All wrapped in transaction.atomic().
    """
    if not batch.current_phase:
        return

    with transaction.atomic():
        # Re-fetch with lock
        batch = models.CropBatch.objects.select_for_update().get(pk=batch.pk)

        phase_payments = models.Payment.objects.filter(
            batch=batch,
            phase=batch.current_phase
        )

        if not phase_payments.exists():
            return

        # Check if ALL payments for this phase are SETTLED
        unsettled = phase_payments.exclude(status=models.PaymentStatus.SETTLED).exists()

        if not unsettled:
            # All settled — update financial status
            if batch.current_phase == models.BatchPhase.DISTRIBUTOR_PHASE:
                batch.financial_status = models.FinancialStatus.DISTRIBUTOR_PHASE_SETTLED
            elif batch.current_phase == models.BatchPhase.RETAILER_PHASE:
                batch.financial_status = models.FinancialStatus.RETAILER_PHASE_SETTLED

            batch.is_locked = False
            batch.save()


def create_payment_records_on_delivery(batch, transport_request):
    """
    Create payment records when a batch is delivered.
    Transporter fees are split 50-50 between sender and receiver.
    Sets batch financial state: current_phase, financial_status, is_locked.
    All wrapped in transaction.atomic().
    """
    from_party = transport_request.from_party
    to_party = transport_request.to_party
    transporter = transport_request.transporter

    if not transporter:
        return

    # Calculate amounts
    quantity = float(batch.quantity)
    farmer_base_price = float(batch.farmer_base_price_per_unit) * quantity
    transporter_fee = float(transport_request.transporter_fee_per_unit) * quantity
    sender_transport_share = transporter_fee / 2
    receiver_transport_share = transporter_fee / 2

    to_party_role = to_party.role

    with transaction.atomic():
        # Re-fetch batch with lock
        batch = models.CropBatch.objects.select_for_update().get(pk=batch.pk)

        if to_party_role == models.StakeholderRole.DISTRIBUTOR:
            phase = models.BatchPhase.DISTRIBUTOR_PHASE

            # Set batch financial state
            batch.current_phase = phase
            batch.financial_status = models.FinancialStatus.PAYMENT_PENDING
            batch.is_locked = True
            batch.save()

            # 1. Distributor → Farmer (BATCH_PAYMENT)
            models.Payment.objects.create(
                batch=batch,
                payer=to_party,
                payee=batch.farmer,
                payer_role=models.StakeholderRole.DISTRIBUTOR,
                payee_role=models.StakeholderRole.FARMER,
                payment_type=models.PaymentType.BATCH_PAYMENT,
                phase=phase,
                amount=farmer_base_price,
                status=models.PaymentStatus.PENDING,
                payee_upi_id=get_upi_id(batch.farmer),
            )

            # 2. Distributor → Transporter (TRANSPORT_SHARE)
            if receiver_transport_share > 0:
                models.Payment.objects.create(
                    batch=batch,
                    payer=to_party,
                    payee=transporter,
                    payer_role=models.StakeholderRole.DISTRIBUTOR,
                    payee_role=models.StakeholderRole.TRANSPORTER,
                    payment_type=models.PaymentType.TRANSPORT_SHARE,
                    phase=phase,
                    amount=receiver_transport_share,
                    status=models.PaymentStatus.PENDING,
                    payee_upi_id=get_upi_id(transporter),
                )

            # 3. Farmer → Transporter (TRANSPORT_SHARE)
            if sender_transport_share > 0:
                models.Payment.objects.create(
                    batch=batch,
                    payer=batch.farmer,
                    payee=transporter,
                    payer_role=models.StakeholderRole.FARMER,
                    payee_role=models.StakeholderRole.TRANSPORTER,
                    payment_type=models.PaymentType.TRANSPORT_SHARE,
                    phase=phase,
                    amount=sender_transport_share,
                    status=models.PaymentStatus.PENDING,
                    payee_upi_id=get_upi_id(transporter),
                )

        elif to_party_role == models.StakeholderRole.RETAILER:
            phase = models.BatchPhase.RETAILER_PHASE

            # Calculate retailer batch payment (includes farmer price + all transport + distributor margin)
            distributor_margin = float(batch.distributor_margin_per_unit) * quantity
            batch_payment_amount = farmer_base_price + transporter_fee + distributor_margin

            # Set batch financial state
            batch.current_phase = phase
            batch.financial_status = models.FinancialStatus.PAYMENT_PENDING
            batch.is_locked = True
            batch.save()

            # 1. Retailer → Distributor (BATCH_PAYMENT)
            models.Payment.objects.create(
                batch=batch,
                payer=to_party,
                payee=from_party,
                payer_role=models.StakeholderRole.RETAILER,
                payee_role=models.StakeholderRole.DISTRIBUTOR,
                payment_type=models.PaymentType.BATCH_PAYMENT,
                phase=phase,
                amount=batch_payment_amount,
                status=models.PaymentStatus.PENDING,
                payee_upi_id=get_upi_id(from_party),
            )

            # 2. Retailer → Transporter (TRANSPORT_SHARE)
            if receiver_transport_share > 0:
                models.Payment.objects.create(
                    batch=batch,
                    payer=to_party,
                    payee=transporter,
                    payer_role=models.StakeholderRole.RETAILER,
                    payee_role=models.StakeholderRole.TRANSPORTER,
                    payment_type=models.PaymentType.TRANSPORT_SHARE,
                    phase=phase,
                    amount=receiver_transport_share,
                    status=models.PaymentStatus.PENDING,
                    payee_upi_id=get_upi_id(transporter),
                )

            # 3. Distributor → Transporter (TRANSPORT_SHARE)
            if sender_transport_share > 0:
                models.Payment.objects.create(
                    batch=batch,
                    payer=from_party,
                    payee=transporter,
                    payer_role=models.StakeholderRole.DISTRIBUTOR,
                    payee_role=models.StakeholderRole.TRANSPORTER,
                    payment_type=models.PaymentType.TRANSPORT_SHARE,
                    phase=phase,
                    amount=sender_transport_share,
                    status=models.PaymentStatus.PENDING,
                    payee_upi_id=get_upi_id(transporter),
                )
