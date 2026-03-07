from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import APIException

class PaymentRequiredException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Batch locked until financial settlement complete.'
    default_code = 'PAYMENT_REQUIRED'

def check_batch_locked(batch):
    """
    Check if batch is locked due to pending financial settlement.
    Returns (is_locked, response) tuple.
    """
    if batch.is_locked:
        return True, Response(
            {"error": "Batch locked until financial settlement complete."},
            status=status.HTTP_400_BAD_REQUEST
        )
    return False, None

def raise_if_locked(batch):
    """
    Raises PaymentRequiredException if batch is locked.
    Use this in ViewSets or methods where returning a Response is not direct.
    """
    if batch.is_locked:
        raise PaymentRequiredException()
