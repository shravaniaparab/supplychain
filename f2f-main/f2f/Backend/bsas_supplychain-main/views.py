from django.contrib.auth import get_user_model
from rest_framework import viewsets

from supplychain import models, serializers

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = serializers.UserSerializer


class StakeholderProfileViewSet(viewsets.ModelViewSet):
    queryset = models.StakeholderProfile.objects.all()
    serializer_class = serializers.StakeholderProfileSerializer


class KYCRecordViewSet(viewsets.ModelViewSet):
    queryset = models.KYCRecord.objects.all()
    serializer_class = serializers.KYCRecordSerializer


class CropBatchViewSet(viewsets.ModelViewSet):
    queryset = models.CropBatch.objects.all()
    serializer_class = serializers.CropBatchSerializer

    def perform_create(self, serializer):
        # Automatically assign the creator's profile as the farmer
        if hasattr(self.request.user, 'stakeholderprofile'):
            serializer.save(farmer=self.request.user.stakeholderprofile)
        else:
            # Fallback or error if user is not a stakeholder
            # For now, let it fail at db level or validation if we don't set it, 
            # but ideally we should raise a ValidationError here.
            serializer.save()



class TransportRequestViewSet(viewsets.ModelViewSet):
    queryset = models.TransportRequest.objects.all()
    serializer_class = serializers.TransportRequestSerializer


class InspectionReportViewSet(viewsets.ModelViewSet):
    queryset = models.InspectionReport.objects.all()
    serializer_class = serializers.InspectionReportSerializer


class BatchSplitViewSet(viewsets.ModelViewSet):
    queryset = models.BatchSplit.objects.all()
    serializer_class = serializers.BatchSplitSerializer


class RetailListingViewSet(viewsets.ModelViewSet):
    queryset = models.RetailListing.objects.all()
    serializer_class = serializers.RetailListingSerializer


class ConsumerScanViewSet(viewsets.ModelViewSet):
    queryset = models.ConsumerScan.objects.all()
    serializer_class = serializers.ConsumerScanSerializer
