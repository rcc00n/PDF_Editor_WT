import uuid
from django.db import models
from django.utils import timezone


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def form_uid() -> str:
    return uid('form')


def version_uid() -> str:
    return uid('ver')


def employee_uid() -> str:
    return uid('emp')


def group_uid() -> str:
    return uid('grp')


def next_ticket_id() -> str:
    last = Ticket.objects.order_by('-created_at').first()
    if last and last.pk and last.pk.startswith('FT-'):
        try:
            num = int(last.pk.replace('FT-', ''))
            return f"FT-{num + 1:04d}"
        except ValueError:
            pass
    return 'FT-0001'


class FormTemplate(models.Model):
    id = models.CharField(primary_key=True, max_length=32, default=form_uid, editable=False)
    name = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name

    class Meta:
        ordering = ['-created_at']


class FormVersion(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    )

    id = models.CharField(primary_key=True, max_length=32, default=version_uid, editable=False)
    form = models.ForeignKey(FormTemplate, related_name='versions', on_delete=models.CASCADE)
    version = models.CharField(max_length=20, default='v1.0')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    fields = models.JSONField(default=list, blank=True)
    pdf = models.FileField(upload_to='pdfs/', null=True, blank=True)
    pdf_name = models.CharField(max_length=255, blank=True)
    pdf_mime = models.CharField(max_length=100, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.form.name} {self.version}"

    class Meta:
        ordering = ['-created_at']


class Ticket(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('synced', 'Synced'),
        ('error', 'Error'),
        ('queued', 'Queued'),
    )

    APPROVAL_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
    )

    id = models.CharField(primary_key=True, max_length=20, editable=False)
    title = models.CharField(max_length=200)
    form = models.ForeignKey(FormTemplate, on_delete=models.PROTECT)
    version = models.ForeignKey(FormVersion, on_delete=models.PROTECT)
    assigned_to = models.CharField(max_length=120)
    assigned_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approval_state = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='pending')
    values = models.JSONField(default=dict, blank=True)
    signature_file = models.FileField(upload_to='signatures/', null=True, blank=True)
    signature_name = models.CharField(max_length=255, blank=True)
    signature_mime = models.CharField(max_length=100, blank=True)
    signature_signer = models.CharField(max_length=120, blank=True)
    last_error = models.TextField(blank=True)
    updated_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.pk:
            self.id = next_ticket_id()
        if not self.updated_at:
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.id

    class Meta:
        ordering = ['-created_at']


class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(upload_to='attachments/')
    name = models.CharField(max_length=255)
    mime = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return self.name

    class Meta:
        ordering = ['-created_at']


class Employee(models.Model):
    id = models.CharField(primary_key=True, max_length=32, default=employee_uid, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    role = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name

    class Meta:
        ordering = ['name']


class AccessGroup(models.Model):
    id = models.CharField(primary_key=True, max_length=32, default=group_uid, editable=False)
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=255, blank=True)
    include_all_employees = models.BooleanField(default=False)
    include_all_forms = models.BooleanField(default=False)
    employees = models.ManyToManyField(Employee, related_name='access_groups', blank=True)
    forms = models.ManyToManyField(FormTemplate, related_name='access_groups', blank=True)
    excluded_employees = models.ManyToManyField(Employee, related_name='excluded_from_access_groups', blank=True)
    excluded_forms = models.ManyToManyField(FormTemplate, related_name='excluded_from_access_groups', blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name

    class Meta:
        ordering = ['name']
