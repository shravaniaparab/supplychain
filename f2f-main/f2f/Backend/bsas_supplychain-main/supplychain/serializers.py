from django.contrib.auth import get_user_model
from rest_framework import serializers
import base64

from supplychain import models
from supplychain.db_file_fields import DatabaseFile, DatabaseImageField


User = get_user_model()


class Base64FileField(serializers.Field):
    """Serializer field for handling file uploads/downloads as base64."""
    
    def to_representation(self, value):
        """Convert database file to base64 data URI for API response."""
        if not value:
            return None
        # Handle DatabaseFile object (has url property)
        if hasattr(value, 'url') and callable(getattr(value, 'url', None)):
            return value.url
        if hasattr(value, 'url'):
            return value.url
        # Handle bytes directly
        if isinstance(value, bytes) and value:
            b64_data = base64.b64encode(value).decode('utf-8')
            return f"data:application/octet-stream;base64,{b64_data}"
        return None
    
    def to_internal_value(self, data):
        """Convert base64 string or uploaded file to database file."""
        if not data:
            return None
        
        # Handle Django UploadedFile
        if hasattr(data, 'read'):
            from supplychain.db_file_fields import DatabaseFile
            file_content = data.read()
            content_type = getattr(data, 'content_type', 'application/octet-stream')
            name = getattr(data, 'name', 'uploaded_file')
            return DatabaseFile(data=file_content, name=name, content_type=content_type)
        
        # Handle data URI format (data:mimetype;base64,content)
        if isinstance(data, str) and data.startswith('data:'):
            try:
                from supplychain.db_file_fields import DatabaseFile
                # Parse data URI
                header, encoded = data.split(',', 1)
                # Extract content type
                content_type = 'application/octet-stream'
                if ';' in header:
                    content_type = header.split(':')[1].split(';')[0]
                # Decode base64
                file_data = base64.b64decode(encoded)
                return DatabaseFile(data=file_data, content_type=content_type)
            except Exception:
                raise serializers.ValidationError("Invalid data URI format")
        
        # Handle plain base64 string
        if isinstance(data, str):
            try:
                from supplychain.db_file_fields import DatabaseFile
                file_data = base64.b64decode(data)
                return DatabaseFile(data=file_data)
            except Exception:
                raise serializers.ValidationError("Invalid base64 format")
        
        return None


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "first_name", "last_name"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)





class StakeholderProfileSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)

    class Meta:
        model = models.StakeholderProfile
        fields = ["id", "user", "user_details", "role", "phone", "wallet_id", "organization", "address", "kyc_status"]

class UserWithProfileSerializer(serializers.ModelSerializer):
    stakeholderprofile = StakeholderProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "date_joined", "is_active", "stakeholderprofile"]



class KYCRecordSerializer(serializers.ModelSerializer):
    profile_details = StakeholderProfileSerializer(source="profile", read_only=True)
    document_file = Base64FileField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = models.KYCRecord
        fields = [
            "id",
            "profile",
            "profile_details",
            "document_type",
            "document_number",
            "document_file",
            "status",
            "verified_by",
            "verified_at",
            "created_at",
        ]



class CropBatchSerializer(serializers.ModelSerializer):
    current_owner_username = serializers.CharField(source="current_owner.username", read_only=True)
    organic_certificate = Base64FileField(required=False, allow_null=True)
    quality_test_report = Base64FileField(required=False, allow_null=True)
    qr_code_image = Base64FileField(required=False, allow_null=True)
    
    class Meta:
        model = models.CropBatch
        fields = [
            "id",
            "farmer",
            "current_owner",
            "current_owner_username",
            "status",
            "farm_location",
            "crop_type",
            "quantity",
            "harvest_date",
            "organic_certificate",
            "quality_test_report",
            "product_batch_id",
            "public_batch_id",
            "qr_code_image",
            "qr_code_data",
            "created_at",
            "is_child_batch",
            "parent_batch",
            "farmer_base_price_per_unit",
            "distributor_margin_per_unit",
            "total_transport_fees",
            "financial_status",
            "current_phase",
            "is_locked",
        ]
        read_only_fields = ["farmer", "product_batch_id", "public_batch_id", "qr_code_image", "qr_code_data", "created_at", "current_owner", "is_child_batch", "parent_batch", "financial_status", "current_phase", "is_locked"]

    total_transport_fees = serializers.SerializerMethodField()

    def get_total_transport_fees(self, obj):
        fees = 0
        current = obj
        while current:
            transports = models.TransportRequest.objects.filter(batch=current, status='DELIVERED')
            for tr in transports:
                fees += float(tr.transporter_fee_per_unit)
            current = current.parent_batch
        return fees



class TransportRequestSerializer(serializers.ModelSerializer):
    batch_details = CropBatchSerializer(source="batch", read_only=True)
    from_party_details = StakeholderProfileSerializer(source="from_party", read_only=True)
    to_party_details = StakeholderProfileSerializer(source="to_party", read_only=True)
    transporter_details = StakeholderProfileSerializer(source="transporter", read_only=True)
    delivery_proof = Base64FileField(required=False, allow_null=True)

    class Meta:
        model = models.TransportRequest
        fields = [
            "id",
            "batch",
            "batch_details",
            "requested_by",
            "from_party",
            "from_party_details",
            "to_party",
            "to_party_details",
            "transporter",
            "transporter_details",
            "status",
            "vehicle_details",
            "driver_details",
            "pickup_at",
            "delivered_at",
            "delivery_proof",
            "transporter_fee_per_unit",
        ]


class InspectionReportSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    distributor_details = StakeholderProfileSerializer(source="distributor", read_only=True)
    batch_details = CropBatchSerializer(source="batch", read_only=True)
    report_file = Base64FileField(required=False, allow_null=True)

    class Meta:
        model = models.InspectionReport
        fields = [
            "id",
            "batch",
            "batch_details",
            "stage",
            "inspection_notes",
            "result",
            "report_file",
            "storage_conditions",
            "passed",
            "created_by",
            "created_by_username",
            "distributor",
            "distributor_details",
            "created_at",
            "inspected_at",
        ]
        read_only_fields = ["created_at", "inspected_at", "created_by", "distributor"]


class BatchSplitSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.BatchSplit
        fields = ["id", "parent_batch", "split_label", "quantity", "destination_retailer", "child_batch", "notes", "created_at"]
        read_only_fields = ["created_at", "child_batch"]


class RetailListingSerializer(serializers.ModelSerializer):
    batch_details = CropBatchSerializer(source="batch", read_only=True)
    retailer_details = StakeholderProfileSerializer(source="retailer", read_only=True)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = models.RetailListing
        fields = [
            "id",
            "batch",
            "batch_details",
            "retailer",
            "retailer_details",
            "farmer_base_price",
            "transport_fees",
            "distributor_margin",
            "retailer_margin",
            "total_price",
            "is_for_sale",
            "created_at",
        ]
        read_only_fields = [
            "created_at", 
            "retailer", 
            "farmer_base_price", 
            "transport_fees", 
            "distributor_margin"
        ]
    
    def get_total_price(self, obj):
        return float(obj.total_price)


class ConsumerScanSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ConsumerScan
        fields = ["id", "listing", "scanned_at", "note"]
        read_only_fields = ["scanned_at"]


class PaymentSerializer(serializers.ModelSerializer):
    batch_details = CropBatchSerializer(source="batch", read_only=True)
    payer_details = StakeholderProfileSerializer(source="payer", read_only=True)
    payee_details = StakeholderProfileSerializer(source="payee", read_only=True)
    counterparty_name = serializers.SerializerMethodField()
    
    class Meta:
        model = models.Payment
        fields = [
            "id",
            "batch",
            "batch_details",
            "payer",
            "payer_details",
            "payee",
            "payee_details",
            "payer_role",
            "payee_role",
            "payment_type",
            "phase",
            "amount",
            "status",
            "payee_upi_id",
            "created_at",
            "updated_at",
            "counterparty_name",
        ]
        read_only_fields = ["created_at", "updated_at"]
    
    def get_counterparty_name(self, obj):
        """Get the name of the counterparty based on current user's perspective."""
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'stakeholderprofile'):
            return None
        
        user_profile = request.user.stakeholderprofile
        if obj.payer == user_profile:
            # Current user is payer, return payee name
            return obj.payee.user.get_full_name() or obj.payee.user.username
        elif obj.payee == user_profile:
            # Current user is payee, return payer name
            return obj.payer.user.get_full_name() or obj.payer.user.username
        return None
