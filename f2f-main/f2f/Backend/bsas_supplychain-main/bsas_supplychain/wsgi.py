"""WSGI config for supplychain project."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bsas_supplychain.settings")

application = get_wsgi_application()
