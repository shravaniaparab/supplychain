"""
Validation utilities for batch status transitions.
"""
from supplychain.models import BatchStatus, StakeholderRole


class BatchStatusTransitionValidator:
    """
    Validates batch status transitions based on user role and current status.
    """
    
    # Define allowed transitions: {current_status: {role: [allowed_next_statuses]}}
    ALLOWED_TRANSITIONS = {
        BatchStatus.CREATED: {
            StakeholderRole.FARMER: [BatchStatus.TRANSPORT_REQUESTED],
        },
        BatchStatus.TRANSPORT_REQUESTED: {
            StakeholderRole.TRANSPORTER: [BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR],
        },
        BatchStatus.IN_TRANSIT_TO_DISTRIBUTOR: {
            StakeholderRole.TRANSPORTER: [BatchStatus.ARRIVED_AT_DISTRIBUTOR],
        },
        BatchStatus.ARRIVED_AT_DISTRIBUTOR: {
            StakeholderRole.DISTRIBUTOR: [BatchStatus.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR],
        },
        BatchStatus.ARRIVAL_CONFIRMED_BY_DISTRIBUTOR: {
            StakeholderRole.TRANSPORTER: [BatchStatus.DELIVERED_TO_DISTRIBUTOR],
        },
        BatchStatus.DELIVERED_TO_DISTRIBUTOR: {
            StakeholderRole.DISTRIBUTOR: [BatchStatus.STORED],
        },
        BatchStatus.STORED: {
            StakeholderRole.DISTRIBUTOR: [BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER],
        },
        BatchStatus.TRANSPORT_REQUESTED_TO_RETAILER: {
            StakeholderRole.TRANSPORTER: [BatchStatus.IN_TRANSIT_TO_RETAILER],
        },
        BatchStatus.IN_TRANSIT_TO_RETAILER: {
            StakeholderRole.TRANSPORTER: [BatchStatus.ARRIVED_AT_RETAILER],
        },
        BatchStatus.ARRIVED_AT_RETAILER: {
            StakeholderRole.RETAILER: [BatchStatus.ARRIVAL_CONFIRMED_BY_RETAILER],
        },
        BatchStatus.ARRIVAL_CONFIRMED_BY_RETAILER: {
            StakeholderRole.TRANSPORTER: [BatchStatus.DELIVERED_TO_RETAILER],
        },
        BatchStatus.DELIVERED_TO_RETAILER: {
            StakeholderRole.RETAILER: [BatchStatus.LISTED],
        },
        BatchStatus.LISTED: {
            StakeholderRole.RETAILER: [BatchStatus.SOLD],
        },
    }
    
    @classmethod
    def can_transition(cls, batch, user, new_status):
        """
        Check if a user can transition a batch to a new status.
        
        Args:
            batch: CropBatch instance
            user: User instance
            new_status: Desired new status
            
        Returns:
            tuple: (bool, str) - (is_allowed, error_message)
        """
        try:
            user_role = user.stakeholderprofile.role
        except:
            return False, "User does not have a stakeholder profile"
        
        current_status = batch.status
        
        # Check if current status has any allowed transitions
        if current_status not in cls.ALLOWED_TRANSITIONS:
            return False, f"No transitions allowed from status {current_status}"
        
        # Check if user's role can perform transitions from current status
        if user_role not in cls.ALLOWED_TRANSITIONS[current_status]:
            return False, f"Role {user_role} cannot transition batch from status {current_status}"
        
        # Check if the new status is in the allowed list
        allowed_statuses = cls.ALLOWED_TRANSITIONS[current_status][user_role]
        if new_status not in allowed_statuses:
            return False, f"Cannot transition from {current_status} to {new_status} as {user_role}"
        
        return True, ""
    
    @classmethod
    def get_allowed_transitions(cls, batch, user):
        """
        Get list of allowed status transitions for a batch and user.
        
        Args:
            batch: CropBatch instance
            user: User instance
            
        Returns:
            list: List of allowed BatchStatus values
        """
        try:
            user_role = user.stakeholderprofile.role
        except:
            return []
        
        current_status = batch.status
        
        if current_status not in cls.ALLOWED_TRANSITIONS:
            return []
        
        if user_role not in cls.ALLOWED_TRANSITIONS[current_status]:
            return []
        
        return cls.ALLOWED_TRANSITIONS[current_status][user_role]
