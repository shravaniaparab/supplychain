from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="StakeholderProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("farmer", "Farmer"), ("transporter", "Transporter"), ("distributor", "Distributor"), ("retailer", "Retailer"), ("consumer", "Consumer"), ("admin", "Admin")], max_length=32)),
                ("organization", models.CharField(blank=True, max_length=255)),
                ("phone_number", models.CharField(blank=True, max_length=32)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="CropBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("crop_type", models.CharField(max_length=120)),
                ("quantity", models.DecimalField(decimal_places=2, max_digits=12)),
                ("harvest_date", models.DateField()),
                ("batch_code", models.CharField(max_length=100, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("farmer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="supplychain.stakeholderprofile")),
            ],
        ),
        migrations.CreateModel(
            name="KYCDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("document_type", models.CharField(max_length=100)),
                ("document_reference", models.CharField(max_length=255)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("verified", models.BooleanField(default=False)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("stakeholder", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="supplychain.stakeholderprofile")),
            ],
        ),
        migrations.CreateModel(
            name="InspectionReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("report_reference", models.CharField(max_length=255)),
                ("storage_conditions", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="supplychain.cropbatch")),
                ("distributor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="supplychain.stakeholderprofile")),
            ],
        ),
        migrations.CreateModel(
            name="RetailListing",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(default="for_sale", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="supplychain.cropbatch")),
                ("retailer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="supplychain.stakeholderprofile")),
            ],
        ),
        migrations.CreateModel(
            name="TransportRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("origin_role", models.CharField(choices=[("farmer", "Farmer"), ("transporter", "Transporter"), ("distributor", "Distributor"), ("retailer", "Retailer"), ("consumer", "Consumer"), ("admin", "Admin")], max_length=32)),
                ("destination_role", models.CharField(choices=[("farmer", "Farmer"), ("transporter", "Transporter"), ("distributor", "Distributor"), ("retailer", "Retailer"), ("consumer", "Consumer"), ("admin", "Admin")], max_length=32)),
                ("status", models.CharField(default="pending", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("accepted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="accepted_requests", to="supplychain.stakeholderprofile")),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="supplychain.cropbatch")),
                ("requested_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="requests", to="supplychain.stakeholderprofile")),
            ],
        ),
        migrations.CreateModel(
            name="Certificate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("certificate_type", models.CharField(max_length=120)),
                ("document_reference", models.CharField(max_length=255)),
                ("issued_at", models.DateField(blank=True, null=True)),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="supplychain.cropbatch")),
            ],
        ),
        migrations.CreateModel(
            name="TransportLeg",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("vehicle_details", models.TextField(blank=True)),
                ("driver_details", models.TextField(blank=True)),
                ("pickup_time", models.DateTimeField(blank=True, null=True)),
                ("delivery_time", models.DateTimeField(blank=True, null=True)),
                ("delivery_proof_reference", models.CharField(blank=True, max_length=255)),
                ("request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="supplychain.transportrequest")),
                ("transporter", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="supplychain.stakeholderprofile")),
            ],
        ),
        migrations.CreateModel(
            name="PriceBreakdown",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("farmer_base_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("transport_fees", models.DecimalField(decimal_places=2, max_digits=12)),
                ("distributor_margin", models.DecimalField(decimal_places=2, max_digits=12)),
                ("retailer_margin", models.DecimalField(decimal_places=2, max_digits=12)),
                ("listing", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to="supplychain.retaillisting")),
            ],
        ),
    ]
