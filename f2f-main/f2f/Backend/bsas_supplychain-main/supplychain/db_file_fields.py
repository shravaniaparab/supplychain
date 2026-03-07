"""
Custom database file storage fields for storing files in PostgreSQL BYTEA columns.
Uses base64 encoding for JSON serialization.
"""

import base64
import mimetypes
from io import BytesIO
from django.core.files.base import ContentFile
from django.db import models
from django.db.models.fields.files import FieldFile


class DatabaseFile:
    """Wrapper for file data stored in database."""
    
    def __init__(self, data=None, name=None, content_type=None):
        self.data = data
        self.name = name
        self.content_type = content_type or 'application/octet-stream'
        self._size = len(data) if data else 0
    
    @property
    def size(self):
        return self._size
    
    @property
    def url(self):
        """Return a data URI for the file."""
        if not self.data:
            return None
        b64_data = base64.b64encode(self.data).decode('utf-8')
        return f"data:{self.content_type};base64,{b64_data}"
    
    def read(self):
        return self.data
    
    def chunks(self, chunk_size=None):
        """Yield chunks of the file data."""
        if self.data:
            yield self.data
    
    def open(self, mode='rb'):
        return BytesIO(self.data) if self.data else None
    
    def __bool__(self):
        return bool(self.data)


class DatabaseFileField(models.BinaryField):
    """
    A field for storing file data in the database as BYTEA.
    Also stores filename and content type.
    """
    
    def __init__(self, *args, **kwargs):
        # Remove upload_to since we don't use filesystem storage
        kwargs.pop('upload_to', None)
        kwargs.pop('storage', None)
        super().__init__(*args, **kwargs)
    
    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        # Don't include upload_to in migrations
        kwargs.pop('upload_to', None)
        kwargs.pop('storage', None)
        return name, path, args, kwargs
    
    def from_db_value(self, value, expression, connection):
        """Convert database value to Python object."""
        if value is None:
            return None
        return DatabaseFile(data=bytes(value))
    
    def to_python(self, value):
        """Convert value to Python object."""
        if value is None:
            return None
        if isinstance(value, DatabaseFile):
            return value
        if isinstance(value, bytes):
            return DatabaseFile(data=value)
        if isinstance(value, str):
            # Assume base64 encoded string
            try:
                data = base64.b64decode(value)
                return DatabaseFile(data=data)
            except:
                return None
        return None
    
    def get_prep_value(self, value):
        """Convert Python object to database value."""
        if value is None:
            return None
        if isinstance(value, DatabaseFile):
            return value.data
        if isinstance(value, bytes):
            return value
        if isinstance(value, str):
            # Assume base64 encoded
            try:
                return base64.b64decode(value)
            except:
                return None
        return None
    
    def value_to_string(self, obj):
        """Convert value to string for serialization."""
        value = self.value_from_object(obj)
        if value is None:
            return None
        if isinstance(value, DatabaseFile):
            return base64.b64encode(value.data).decode('utf-8') if value.data else None
        if isinstance(value, bytes):
            return base64.b64encode(value).decode('utf-8')
        return None


class DatabaseImageField(DatabaseFileField):
    """
    A field for storing image data in the database as BYTEA.
    """
    pass
