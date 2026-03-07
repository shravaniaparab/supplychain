"""
Helper utilities for batch event logging.
"""
from supplychain.models import BatchEvent, BatchEventType


def log_batch_event(batch, event_type, user, metadata=None):
    """
    Create a batch event log entry.
    
    Args:
        batch: CropBatch instance
        event_type: BatchEventType choice
        user: User who performed the action
        metadata: Optional dict with additional context
    
    Returns:
        BatchEvent instance
    """
    # Ensure metadata is a dict
    if metadata is None:
        metadata = {}
    
    # Add standard fields
    metadata.update({
        'batch_status': batch.status,
        'batch_quantity': str(batch.quantity),
        'batch_crop_type': batch.crop_type,
        'performer_username': user.username,
        'performer_role': getattr(user.stakeholderprofile, 'role', 'unknown') if hasattr(user, 'stakeholderprofile') else 'unknown'
    })
    
    # Add ownership info if relevant
    if batch.current_owner:
        metadata['current_owner'] = batch.current_owner.username
    
    return BatchEvent.objects.create(
        batch=batch,
        event_type=event_type,
        performed_by=user,
        metadata=metadata
    )


def log_ownership_transfer(batch, from_user, to_user, event_type, user_performing_action, reason=None):
    """
    Log a specific ownership transfer event.
    
    Args:
        batch: CropBatch instance
        from_user: User losing ownership
        to_user: User gaining ownership
        event_type: BatchEventType for the transfer
        user_performing_action: User who initiated the transfer
        reason: Optional reason for transfer
    """
    metadata = {
        'from_owner': from_user.username if from_user else None,
        'to_owner': to_user.username if to_user else None,
        'reason': reason or 'Standard workflow transition'
    }
    
    return log_batch_event(
        batch=batch,
        event_type=event_type,
        user=user_performing_action,
        metadata=metadata
    )
