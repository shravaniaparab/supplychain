"""Admin views for managing KYC, users, and system monitoring."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from supplychain import models
from supplychain.serializers import (
    KYCRecordSerializer,
    StakeholderProfileSerializer,
    UserSerializer,
    UserWithProfileSerializer,
)


User = get_user_model()


class IsAdminUser(BasePermission):
    """Permission class to check if user is admin."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and hasattr(request.user, "stakeholderprofile")
            and request.user.stakeholderprofile.role == models.StakeholderRole.ADMIN
        )


class PendingKYCListView(APIView):
    """List all pending KYC records for admin review."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        pending_kyc = models.KYCRecord.objects.filter(
            status=models.KYCStatus.PENDING
        ).select_related("profile", "profile__user")
        serializer = KYCRecordSerializer(pending_kyc, many=True)
        return Response(serializer.data)


class AllKYCListView(APIView):
    """List all KYC records with filtering."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get("status")
        kyc_records = models.KYCRecord.objects.all().select_related(
            "profile", "profile__user"
        )

        if status_filter:
            kyc_records = kyc_records.filter(status=status_filter)

        serializer = KYCRecordSerializer(kyc_records, many=True)
        return Response(serializer.data)


class KYCDecisionView(APIView):
    """Approve or reject a KYC record."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            kyc_record = models.KYCRecord.objects.get(pk=pk)
        except models.KYCRecord.DoesNotExist:
            return Response(
                {"message": "KYC record not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        decision = request.data.get("decision")  # 'approved' or 'rejected'
        notes = request.data.get("notes", "")

        if decision not in [models.KYCStatus.APPROVED, models.KYCStatus.REJECTED]:
            return Response(
                {"message": "Decision must be 'approved' or 'rejected'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update KYC record
        kyc_record.status = decision
        kyc_record.verified_by = request.user  # Corrected: Must be User instance
        kyc_record.notes = notes
        kyc_record.save()



        # Update stakeholder profile KYC status
        profile = kyc_record.profile
        profile.kyc_status = decision
        profile.save()

        return Response(
            {
                "message": f"KYC {decision} successfully",
                "kyc": KYCRecordSerializer(kyc_record).data,
            }
        )


class UserListView(APIView):
    """List all users with their profiles."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        role_filter = request.query_params.get("role")
        
        # Exclude superusers and users with ADMIN role
        users = User.objects.filter(is_superuser=False).exclude(stakeholderprofile__role=models.StakeholderRole.ADMIN).prefetch_related("stakeholderprofile")

        if role_filter:
            users = users.filter(stakeholderprofile__role=role_filter)

        serializer = UserWithProfileSerializer(users, many=True)

        return Response(serializer.data)


class UserDetailView(APIView):
    """Get or update a specific user."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UserSerializer(user)
        return Response(serializer.data)

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Update user fields
        if "is_active" in request.data:
            user.is_active = request.data["is_active"]
        if "email" in request.data:
            user.email = request.data["email"]
        user.save()

        # Update profile if provided
        if "profile" in request.data:
            profile = user.stakeholderprofile
            profile_data = request.data["profile"]
            for key, value in profile_data.items():
                if hasattr(profile, key):
                    setattr(profile, key, value)
            profile.save()

        return Response(UserSerializer(user).data)


class DashboardStatsView(APIView):
    """Get dashboard statistics for admin."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        stats = {
            "total_users": User.objects.count(),
            "pending_kyc": models.KYCRecord.objects.filter(
                status=models.KYCStatus.PENDING
            ).count(),
            "approved_kyc": models.KYCRecord.objects.filter(
                status=models.KYCStatus.APPROVED
            ).count(),
            "rejected_kyc": models.KYCRecord.objects.filter(
                status=models.KYCStatus.REJECTED
            ).count(),
            "users_by_role": {
                "farmers": models.StakeholderProfile.objects.filter(
                    role=models.StakeholderRole.FARMER
                ).count(),
                "transporters": models.StakeholderProfile.objects.filter(
                    role=models.StakeholderRole.TRANSPORTER
                ).count(),
                "distributors": models.StakeholderProfile.objects.filter(
                    role=models.StakeholderRole.DISTRIBUTOR
                ).count(),
                "retailers": models.StakeholderProfile.objects.filter(
                    role=models.StakeholderRole.RETAILER
                ).count(),
                "consumers": models.StakeholderProfile.objects.filter(
                    role=models.StakeholderRole.CONSUMER
                ).count(),
            },
            "total_batches": models.CropBatch.objects.count(),
            "total_transport_requests": models.TransportRequest.objects.count(),
        }
        return Response(stats)
