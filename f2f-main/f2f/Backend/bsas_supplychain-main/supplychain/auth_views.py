from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from supplychain import models
from supplychain.db_file_fields import DatabaseFile

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data

        # Required fields
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role", "").lower()

        # Optional fields
        phone = data.get("phone", "")
        organization = data.get("organization", "")
        address = data.get("address", "")
        wallet_id = data.get("wallet_id", "")
        
        # Document fields from registration form
        document_type = data.get("document_type", "")
        document_file = request.FILES.get("document")

        # Validation
        if not all([username, email, password, role]):
            return Response(
                {"message": "Username, email, password and role are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in [r.value for r in models.StakeholderRole]:
            return Response(
                {"message": f"Invalid role. Must be one of: {[r.value for r in models.StakeholderRole]}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"message": "Username already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"message": "Email already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Create user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                )

                # Create stakeholder profile
                profile = models.StakeholderProfile.objects.create(
                    user=user,
                    role=role,
                    phone=phone,
                    organization=organization,
                    address=address,
                    wallet_id=wallet_id,
                    kyc_status=models.KYCStatus.PENDING,
                )

                # Process document file if uploaded
                db_file = None
                if document_file:
                    # Read file content and create DatabaseFile
                    file_content = document_file.read()
                    db_file = DatabaseFile(
                        data=file_content,
                        name=document_file.name,
                        content_type=document_file.content_type or 'application/octet-stream'
                    )

                # Create KYC record with uploaded document
                kyc_record = models.KYCRecord.objects.create(
                    profile=profile,
                    document_type=document_type.lower() if document_type else "registration",
                    document_number="pending",
                    document_file=db_file,
                    status=models.KYCStatus.PENDING,
                )

            return Response(
                {
                    "message": "Registration successful. Please wait for KYC approval.",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    },
                    "role": profile.role,
                    "kyc_status": profile.kyc_status,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"message": f"Registration failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # 'email' field in request can be email or username
        identifier = request.data.get("email")
        password = request.data.get("password")

        if not identifier or not password:
            return Response(
                {"message": "Email/Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Try fetching by email first, then username
        user = User.objects.filter(email=identifier).first()
        if not user:
            user = User.objects.filter(username=identifier).first()

        if not user:
            return Response(
                {"message": "User not found. Please check your email/username."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


        if not user.check_password(password):
            return Response(
                {"message": "Incorrect password. Please try again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            profile = models.StakeholderProfile.objects.get(user=user)
        except models.StakeholderProfile.DoesNotExist:
            # If user is superuser, create an Admin profile automatically
            if user.is_superuser:
                profile = models.StakeholderProfile.objects.create(
                    user=user,
                    role=models.StakeholderRole.ADMIN,
                    kyc_status=models.KYCStatus.APPROVED,
                    phone="N/A",
                    organization="System Admin"
                )
            else:
                return Response(
                    {"message": "User profile not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )


        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "token": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
                "role": profile.role.upper(),
                "kyc_status": profile.kyc_status.upper(),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {"message": "Logout successful"},
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {"message": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            profile = models.StakeholderProfile.objects.get(user=user)
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"message": "User profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "role": profile.role.upper(),
                "kyc_status": profile.kyc_status.upper(),
                "profile": {
                    "organization": profile.organization,
                    "phone": profile.phone,
                    "address": profile.address,
                    "wallet_id": profile.wallet_id,
                },
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        user = request.user
        try:
            profile = models.StakeholderProfile.objects.get(user=user)
        except models.StakeholderProfile.DoesNotExist:
            return Response(
                {"message": "User profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data
        
        # Update User fields
        if "first_name" in data:
            user.first_name = data["first_name"]
        if "last_name" in data:
            user.last_name = data["last_name"]
        if "email" in data:
            user.email = data["email"]
        user.save()

        # Update Profile fields
        if "organization" in data:
            profile.organization = data["organization"]
        if "address" in data:
            profile.address = data["address"]
        if "phone" in data:
            profile.phone = data["phone"]
        
        profile.save()

        return Response(
            {
                "message": "Profile updated successfully",
                "first_name": user.first_name,
                "last_name": user.last_name,
                "stakeholder_profile": {
                    "organization": profile.organization,
                    "address": profile.address,
                    "phone": profile.phone,
                }
            },
            status=status.HTTP_200_OK,
        )
