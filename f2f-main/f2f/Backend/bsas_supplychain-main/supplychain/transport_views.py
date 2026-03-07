from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from django.utils import timezone
from . import models, serializers
from .batch_validators import BatchStatusTransitionValidator
from .event_logger import log_batch_event, log_ownership_transfer
from .models import BatchEventType, BatchStatus
from .payment_views import create_payment_records_on_delivery
from .view_utils import check_batch_locked


class TransportRequestCreateView(APIView):
    """
    Create a transport request for a batch.
    Farmer initiates transport to distributor.
    """
    
    def post(self, request):
        batch_id = request.data.get('batch_id')
        distributor_id = request.data.get('distributor_id')
        
        if not batch_id or not distributor_id:
            return Response(
                {"success": False, "message": "batch_id and distributor_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get batch and validate ownership
        batch = get_object_or_404(models.CropBatch, id=batch_id)
        
        # Suspend guard
        if batch.status == BatchStatus.SUSPENDED:
            return Response(
                {"success": False, "message": "This batch has been suspended and cannot proceed further."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Financial lock guard
        # Batch lock guard
        is_locked, lock_response = check_batch_locked(batch)
        if is_locked:
            return lock_response
        
        # Verify user is the farmer who owns this batch
        try:
            user_profile = request.user.stakeholderprofile
            if batch.farmer != user_profile:
                return Response(
                    {"success": False, "message": "You can only request transport for your own batches"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate status transition
        can_transition, error_msg = BatchStatusTransitionValidator.can_transition(
            batch, request.user, models.BatchStatus.TRANSPORT_REQUESTED
        )
        
        if not can_transition:
            return Response(
                {"success": False, "message": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get distributor
        distributor = get_object_or_404(
            models.StakeholderProfile, 
            id=distributor_id,
            role=models.StakeholderRole.DISTRIBUTOR
        )
        
        # Create transport request
        transport_request = models.TransportRequest.objects.create(
            batch=batch,
            requested_by=user_profile,
            from_party=user_profile,
            to_party=distributor,
            status='PENDING'
        )
        
        # Update batch status
        batch.status = models.BatchStatus.TRANSPORT_REQUESTED
        batch.save()
        
        # Log event
        log_batch_event(
            batch=batch,
            event_type=BatchEventType.TRANSPORT_REQUESTED,
            user=request.user,
            metadata={
                'distributor': distributor.user.username,
                'transport_request_id': transport_request.id,
            }
        )
        
        return Response({
            "success": True,
            "message": "Transport request created successfully",
            "transport_request_id": transport_request.id,
            "batch_status": batch.status
        }, status=status.HTTP_201_CREATED)


class TransportAcceptView(APIView):
    """
    Transporter accepts a transport request.
    """
    
    def post(self, request, pk):
        transport_request = get_object_or_404(models.TransportRequest, id=pk)
        batch = transport_request.batch
        
        # Suspend guard
        if batch.status == BatchStatus.SUSPENDED:
            return Response(
                {"success": False, "message": "This batch has been suspended and cannot proceed further."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Financial lock guard
        # Batch lock guard
        is_locked, lock_response = check_batch_locked(batch)
        if is_locked:
            return lock_response
        
        # Verify user is a transporter
        try:
            user_profile = request.user.stakeholderprofile
            if user_profile.role != models.StakeholderRole.TRANSPORTER:
                return Response(
                    {"success": False, "message": "Only transporters can accept transport requests"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine correct next status based on destination
        to_party_role = transport_request.to_party.role
        if to_party_role == models.StakeholderRole.DISTRIBUTOR:
            next_status = models.BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR
        elif to_party_role == models.StakeholderRole.RETAILER:
            next_status = models.BatchStatus.IN_TRANSIT_TO_RETAILER
        else:
            return Response(
                {"success": False, "message": "Invalid destination role"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate status transition
        can_transition, error_msg = BatchStatusTransitionValidator.can_transition(
            batch, request.user, next_status
        )
        
        if not can_transition:
            return Response(
                {"success": False, "message": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update transport request with fee
        print(f"DEBUG: TransportAcceptView request.data={request.data}")
        fee = request.data.get('transporter_fee_per_unit', 0)
        try:
            transport_request.transporter_fee_per_unit = float(fee)
        except (ValueError, TypeError):
            transport_request.transporter_fee_per_unit = 0
            
        transport_request.transporter = user_profile
        transport_request.status = 'ACCEPTED'
        transport_request.save()
        
        # Update batch status based on destination
        batch.status = next_status
        batch.save()
        
        # Log event
        log_batch_event(
            batch=batch,
            event_type=BatchEventType.TRANSPORT_ACCEPTED,
            user=request.user,
            metadata={
                'transport_request_id': transport_request.id,
            }
        )
        
        return Response({
            "success": True,
            "message": "Transport request accepted",
            "batch_status": batch.status
        }, status=status.HTTP_200_OK)


class TransportDeliverView(APIView):
    """
    Transporter marks delivery as complete.
    """
    
    def post(self, request, pk):
        transport_request = get_object_or_404(models.TransportRequest, id=pk)
        batch = transport_request.batch
        
        # Suspend guard
        if batch.status == BatchStatus.SUSPENDED:
            return Response(
                {"success": False, "message": "This batch has been suspended and cannot proceed further."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify user is the assigned transporter
        try:
            user_profile = request.user.stakeholderprofile
            if transport_request.transporter != user_profile:
                return Response(
                    {"success": False, "message": "Only the assigned transporter can mark delivery"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except AttributeError:
            return Response(
                {"success": False, "message": "Transport request not assigned to a transporter"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine correct next status based on destination
        to_party_role = transport_request.to_party.role
        if to_party_role == models.StakeholderRole.DISTRIBUTOR:
            next_status = models.BatchStatus.DELIVERED_TO_DISTRIBUTOR
            event_type = BatchEventType.DELIVERED_TO_DISTRIBUTOR
        elif to_party_role == models.StakeholderRole.RETAILER:
            next_status = models.BatchStatus.DELIVERED_TO_RETAILER
            event_type = BatchEventType.DELIVERED_TO_RETAILER
        else:
            return Response(
                {"success": False, "message": "Invalid destination role"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status transition
        can_transition, error_msg = BatchStatusTransitionValidator.can_transition(
            batch, request.user, next_status
        )
        
        if not can_transition:
            return Response(
                {"success": False, "message": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update transport request
        transport_request.status = 'DELIVERED'
        transport_request.delivered_at = timezone.now()
        transport_request.save()
        
        # Update batch status and owner
        batch.status = next_status
        batch.current_owner = transport_request.to_party.user
        batch.save()
        
        # Log event
        from .event_logger import log_ownership_transfer
        log_ownership_transfer(
            batch=batch,
            from_user=transport_request.from_party.user,
            to_user=transport_request.to_party.user,
            event_type=event_type,
            user_performing_action=request.user,
            reason=f"Delivery to {to_party_role} confirmed by transporter after receiver arrival confirmation"
        )
        
        # Create payment records for this delivery
        create_payment_records_on_delivery(batch, transport_request)
        
        return Response({
            "success": True,
            "message": "Delivery confirmed",
            "batch_status": batch.status,
            "new_owner": batch.current_owner.username
        }, status=status.HTTP_200_OK)


class TransportArriveView(APIView):
    """
    Transporter marks shipment as arrived at destination.
    Transitions status to ARRIVED.
    """
    def post(self, request, pk):
        transport_request = get_object_or_404(models.TransportRequest, id=pk)
        batch = transport_request.batch
        
        # Suspend guard
        if batch.status == BatchStatus.SUSPENDED:
            return Response(
                {"success": False, "message": "This batch has been suspended"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Verify user is assigned transporter
        if transport_request.transporter != request.user.stakeholderprofile:
            return Response(
                {"success": False, "message": "Only the assigned transporter can mark arrival"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Determine next batch status
        to_party_role = transport_request.to_party.role
        if to_party_role == models.StakeholderRole.DISTRIBUTOR:
            next_status = models.BatchStatus.ARRIVED_AT_DISTRIBUTOR
            event_type = BatchEventType.ARRIVED_AT_DISTRIBUTOR
        elif to_party_role == models.StakeholderRole.RETAILER:
            next_status = models.BatchStatus.ARRIVED_AT_RETAILER
            event_type = BatchEventType.ARRIVED_AT_RETAILER
        else:
            return Response({"success": False, "message": "Invalid destination"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Validate transition
        can, err = BatchStatusTransitionValidator.can_transition(batch, request.user, next_status)
        if not can:
            return Response({"success": False, "message": err}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update
        transport_request.status = 'ARRIVED'
        transport_request.save()
        
        batch.status = next_status
        batch.save()
        
        log_batch_event(batch=batch, event_type=event_type, user=request.user)
        
        return Response({
            "success": True, 
            "message": "Arrival marked", 
            "batch_status": batch.status
        })


class TransportConfirmArrivalView(APIView):
    """
    Receiver confirms shipment arrival.
    Transitions status to ARRIVAL_CONFIRMED.
    """
    def post(self, request, pk):
        transport_request = get_object_or_404(models.TransportRequest, id=pk)
        batch = transport_request.batch
        
        # Suspend guard
        if batch.status == BatchStatus.SUSPENDED:
            return Response(
                {"success": False, "message": "This batch has been suspended"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Verify user is receiver
        if transport_request.to_party != request.user.stakeholderprofile:
            return Response(
                {"success": False, "message": "Only the receiver can confirm arrival"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Determine next batch status
        to_party_role = transport_request.to_party.role
        if to_party_role == models.StakeholderRole.DISTRIBUTOR:
            next_status = models.BatchStatus.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR
            event_type = BatchEventType.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR
        elif to_party_role == models.StakeholderRole.RETAILER:
            next_status = models.BatchStatus.ARRIVAL_CONFIRMED_BY_RETAILER
            event_type = BatchEventType.ARRIVAL_CONFIRMED_BY_RETAILER
        else:
            return Response({"success": False, "message": "Invalid destination"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Validate transition
        can, err = BatchStatusTransitionValidator.can_transition(batch, request.user, next_status)
        if not can:
            return Response({"success": False, "message": err}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update
        transport_request.status = 'ARRIVAL_CONFIRMED'
        transport_request.save()
        
        batch.status = next_status
        batch.save()
        
        log_batch_event(batch=batch, event_type=event_type, user=request.user)
        
        return Response({
            "success": True, 
            "message": "Arrival confirmed by receiver", 
            "batch_status": batch.status
        })


class TransportRejectView(APIView):
    """
    Transporter rejects a transport request.
    Returns batch to CREATED status.
    """
    
    def post(self, request, pk):
        transport_request = get_object_or_404(models.TransportRequest, id=pk)
        batch = transport_request.batch
        
        # Verify user is a transporter
        try:
            user_profile = request.user.stakeholderprofile
            if user_profile.role != models.StakeholderRole.TRANSPORTER:
                return Response(
                    {"success": False, "message": "Only transporters can reject transport requests"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except:
            return Response(
                {"success": False, "message": "User profile not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if transport_request.status != 'PENDING':
            return Response(
                {"success": False, "message": "Only pending requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update transport request
        transport_request.status = 'REJECTED'
        transport_request.save()
        
        # Reset batch status based on where it came from
        if batch.status == models.BatchStatus.TRANSPORT_REQUESTED:
            batch.status = models.BatchStatus.CREATED
        elif batch.status == models.BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER:
            batch.status = models.BatchStatus.STORED_BY_DISTRIBUTOR
        
        batch.save()
        
        # Log event
        log_batch_event(
            batch=batch,
            event_type=models.BatchEventType.TRANSPORT_REJECTED,
            user=request.user,
            metadata={
                'transport_request_id': transport_request.id,
            }
        )
        
        return Response({
            "success": True,
            "message": "Transport request rejected",
            "batch_status": batch.status
        }, status=status.HTTP_200_OK)
