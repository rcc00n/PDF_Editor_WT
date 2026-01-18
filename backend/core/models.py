import uuid

from django.db import IntegrityError, models, transaction
from django.db.models import Max
from django.db.models.functions import Cast, Substr
from django.utils import timezone


def uid(prefix: str) -> str:
    """Generate a prefixed unique identifier."""
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
    # Ticket IDs look like "FT-0001"; parse the numeric suffix.
    result = Ticket.objects.annotate(
        num=Cast(Substr('id', 4), models.IntegerField())
    ).aggregate(max_num=Max('num'))
    max_num = result.get('max_num') or 0
    return f"FT-{max_num + 1:04d}"


class FormVersionStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    ACTIVE = 'active', 'Active'
    ARCHIVED = 'archived', 'Archived'


class TicketStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    SYNCED = 'synced', 'Synced'
    ERROR = 'error', 'Error'
    QUEUED = 'queued', 'Queued'


class TicketApprovalState(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'


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
    status = models.CharField(max_length=20, choices=FormVersionStatus.choices, default=FormVersionStatus.DRAFT, db_index=True)
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
    id = models.CharField(primary_key=True, max_length=20, editable=False)
    title = models.CharField(max_length=200)
    form = models.ForeignKey(FormTemplate, on_delete=models.PROTECT)
    version = models.ForeignKey(FormVersion, on_delete=models.PROTECT)
    assigned_to = models.CharField(max_length=120, db_index=True)
    assigned_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.PENDING, db_index=True)
    approval_state = models.CharField(max_length=20, choices=TicketApprovalState.choices, default=TicketApprovalState.PENDING, db_index=True)
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
            # Retry on collision from concurrent inserts.
            for _ in range(5):
                self.id = next_ticket_id()
                try:
                    with transaction.atomic():
                        return super().save(*args, **kwargs)
                except IntegrityError:
                    continue
            raise IntegrityError('Failed to generate unique ticket ID after retries')
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
    active = models.BooleanField(default=True, db_index=True)
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
