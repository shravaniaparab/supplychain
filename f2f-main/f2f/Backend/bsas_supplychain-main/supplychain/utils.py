import qrcode
from django.conf import settings
from io import BytesIO

from .db_file_fields import DatabaseFile, DatabaseImageField

def generate_batch_qr(batch):
    """
    Generates a QR code for a CropBatch and saves it to the qr_code_image field.
    The QR content points to the public trace page on localhost.
    Stores the image directly in the database.
    """
    if not batch.public_batch_id:
        import uuid
        batch.public_batch_id = str(uuid.uuid4())
        batch.save()

    # Content for the QR code
    # As per instructions: http://localhost:3000/trace/<public_batch_id>
    qr_url = f"http://localhost:3000/trace/{batch.public_batch_id}"
    
    # Generate QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save image to BytesIO
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    # Create DatabaseFile with the image data
    qr_file = DatabaseFile(
        data=buffer.getvalue(),
        name=f"qr_{batch.public_batch_id[:8]}.png",
        content_type="image/png"
    )
    
    # Update Model Field
    batch.qr_code_image = qr_file
    batch.qr_code_data = qr_url  # Storing the URL as well for convenience
    batch.save(update_fields=['qr_code_image', 'qr_code_data'])
    
    return batch.qr_code_image.url
