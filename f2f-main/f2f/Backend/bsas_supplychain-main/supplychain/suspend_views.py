"""
Views for Batch Suspend functionality.
Allows stakeholders to freeze a batch based on role-specific rules.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from . import models
from .event_logger import log_batch_event
from .models import BatchEventType, BatchStatus, StakeholderRole


# Role-based allowed statuses for suspend action
SUSPEND_ALLOWED_STATUSES = {
    StakeholderRole.FARMER: [
        BatchStatus.CREATED,
        BatchStatus.TRANSPORT_REQUESTED,
        BatchStatus.TRANSPORT_REJECTED,
    ],
    StakeholderRole.DISTRIBUTOR: [
        BatchStatus.DELIVERED_TO_DISTRIBUTOR,
        BatchStatus.STORED,
    ],
    StakeholderRole.RETAILER: [
        BatchStatus.LISTED,
    ],
}


class SuspendBatchView(APIView):
    """
    Suspend a batch. Only the owning stakeholder can suspend,
    and only when the batch is in an allowed status for their role.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, batch_id):
        # Get batch
        try:
            batch = models.CropBatch.objects.get(id=batch_id)
        except models.CropBatch.DoesNotExist:
            return Response(
                {"success": False, "message": "Batch not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Already suspended
        if batch.status == BatchStatus.SUSPENDED:
            return Response(
                {"success": False, "message": "Batch is already suspended."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get user profile and role
        try:
            profile = request.user.stakeholderprofile
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_role = profile.role

        # Verify ownership
        # Farmer can suspend batches they created (even if current_owner has moved)
        # but only while the batch is still in farmer-stage statuses
        if user_role == StakeholderRole.FARMER:
            if batch.farmer != profile:
                return Response(
                    {"success": False, "message": "You can only suspend your own batches."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            if batch.current_owner != request.user:
                return Response(
                    {"success": False, "message": "You do not own this batch."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Check role is allowed to suspend
        allowed_statuses = SUSPEND_ALLOWED_STATUSES.get(user_role, [])
        if not allowed_statuses:
            return Response(
                {"success": False, "message": f"Role {user_role} cannot suspend batches."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check current status is suspendable for this role
        if batch.status not in allowed_statuses:
            return Response(
                {
                    "success": False,
                    "message": f"Cannot suspend batch with status {batch.status}. "
                               f"Allowed statuses for your role: {[s.value for s in allowed_statuses]}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Suspend the batch
        batch.status = BatchStatus.SUSPENDED
        batch.save()

        reason = request.data.get('reason', 'No reason provided')

        # Log event
        log_batch_event(
            batch=batch,
            event_type=BatchEventType.SUSPENDED,
            user=request.user,
            metadata={
                "suspended_by_role": user_role,
                "suspended_by": request.user.username,
                "suspend_reason": reason,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Batch suspended successfully.",
                "batch_id": batch.id,
                "status": batch.status,
            },
            status=status.HTTP_200_OK,
        )
