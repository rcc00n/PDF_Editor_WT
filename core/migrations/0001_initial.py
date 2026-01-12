from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone
import uuid
import core.models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='FormTemplate',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=32, default=core.models.form_uid, editable=False, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('subtitle', models.CharField(max_length=200, blank=True)),
                ('created_at', models.DateTimeField(default=timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FormVersion',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=32, default=core.models.version_uid, editable=False, serialize=False)),
                ('version', models.CharField(max_length=20, default='v1.0')),
                ('status', models.CharField(max_length=20, choices=[('draft', 'Draft'), ('active', 'Active'), ('archived', 'Archived')], default='draft')),
                ('fields', models.JSONField(default=list, blank=True)),
                ('pdf', models.FileField(upload_to='pdfs/', null=True, blank=True)),
                ('pdf_name', models.CharField(max_length=255, blank=True)),
                ('pdf_mime', models.CharField(max_length=100, blank=True)),
                ('published_at', models.DateTimeField(null=True, blank=True)),
                ('created_at', models.DateTimeField(default=timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('form', models.ForeignKey(related_name='versions', on_delete=django.db.models.deletion.CASCADE, to='core.formtemplate')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Employee',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=32, default=core.models.employee_uid, editable=False, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('email', models.EmailField(max_length=254, blank=True)),
                ('role', models.CharField(max_length=120, blank=True)),
                ('phone', models.CharField(max_length=40, blank=True)),
                ('active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(default=timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Ticket',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=20, editable=False, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('assigned_to', models.CharField(max_length=120)),
                ('assigned_at', models.DateTimeField(default=timezone.now)),
                ('status', models.CharField(max_length=20, choices=[('pending', 'Pending'), ('in_progress', 'In Progress'), ('synced', 'Synced'), ('error', 'Error'), ('queued', 'Queued')], default='pending')),
                ('approval_state', models.CharField(max_length=20, choices=[('pending', 'Pending'), ('approved', 'Approved')], default='pending')),
                ('values', models.JSONField(default=dict, blank=True)),
                ('signature_file', models.FileField(upload_to='signatures/', null=True, blank=True)),
                ('signature_name', models.CharField(max_length=255, blank=True)),
                ('signature_mime', models.CharField(max_length=100, blank=True)),
                ('signature_signer', models.CharField(max_length=120, blank=True)),
                ('last_error', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(default=timezone.now)),
                ('created_at', models.DateTimeField(default=timezone.now)),
                ('form', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='core.formtemplate')),
                ('version', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='core.formversion')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Attachment',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('file', models.FileField(upload_to='attachments/')),
                ('name', models.CharField(max_length=255)),
                ('mime', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(default=timezone.now)),
                ('ticket', models.ForeignKey(related_name='attachments', on_delete=django.db.models.deletion.CASCADE, to='core.ticket')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AccessGroup',
            fields=[
                ('id', models.CharField(primary_key=True, max_length=32, default=core.models.group_uid, editable=False, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('description', models.CharField(max_length=255, blank=True)),
                ('created_at', models.DateTimeField(default=timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employees', models.ManyToManyField(blank=True, related_name='access_groups', to='core.employee')),
                ('forms', models.ManyToManyField(blank=True, related_name='access_groups', to='core.formtemplate')),
            ],
            options={
                'ordering': ['name'],
            },
        ),
    ]
