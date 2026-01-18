import base64
import binascii
import mimetypes
import uuid
from functools import wraps

from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccessGroup, Attachment, Employee, FormTemplate, FormVersion, Ticket, uid
from .permissions import is_admin
from .serializers import (
    AccessGroupSerializer,
    EmployeeSerializer,
    FormTemplateSerializer,
    TicketSerializer,
    TicketUpdateSerializer,
)

FORM_PREFETCH = ('versions',)
TICKET_PREFETCH = ('attachments',)
ACCESS_GROUP_PREFETCH = ('employees', 'excluded_employees', 'forms', 'excluded_forms')


def form_queryset():
    # Keep versions prefetched for serialization.
    return FormTemplate.objects.prefetch_related(*FORM_PREFETCH)


def ticket_queryset():
    # Keep related data prefetched for serialization.
    return Ticket.objects.select_related('form', 'version').prefetch_related(*TICKET_PREFETCH)


def access_group_queryset():
    # Load group relations once for access checks.
    return AccessGroup.objects.prefetch_related(*ACCESS_GROUP_PREFETCH)


def serialize_forms(forms, request):
    # Keep serializer responses consistent.
    return FormTemplateSerializer(forms, many=True, context={'request': request}).data


def serialize_form(form, request):
    return FormTemplateSerializer(form, context={'request': request}).data


def serialize_tickets(tickets, request):
    # Keep serializer responses consistent.
    return TicketSerializer(tickets, many=True, context={'request': request}).data


def serialize_ticket(ticket, request):
    return TicketSerializer(ticket, context={'request': request}).data


def admin_required(view_method):
    """Decorator to enforce admin-only access on view methods."""
    @wraps(view_method)
    def wrapper(self, request, *args, **kwargs):
        if not is_admin(request.user):
            # Return 403 for non-admin access.
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        return view_method(self, request, *args, **kwargs)
    return wrapper


def bump_version(current: str) -> str:
    try:
        v = current.lstrip('vV')
        major, minor = v.split('.', 1)
        return f"v{int(major)}.{int(minor) + 1}"
    except (AttributeError, TypeError, ValueError):
        # Fall back to a safe default on malformed versions.
        return 'v1.0'


def clone_fields(fields):
    # Clone field dicts with fresh IDs.
    return [{**field, 'id': uid('fld')} for field in (fields or [])]


def data_url_to_content(data_url: str, fallback_name: str):
    # Parse a data URL into filename/content/mime parts.
    if not data_url:
        return None, None, None
    if ',' in data_url:
        header, b64 = data_url.split(',', 1)
    else:
        header, b64 = '', data_url
    mime = 'application/octet-stream'
    if header.startswith('data:'):
        mime = header.split(';')[0].replace('data:', '')
    ext = mimetypes.guess_extension(mime) or ''
    filename = f"{fallback_name}{ext}"
    b64_payload = (b64 or '').strip()
    padding = (-len(b64_payload)) % 4
    if padding:
        # Add missing padding so base64 decoding can validate properly.
        b64_payload = f"{b64_payload}{'=' * padding}"
    try:
        content = ContentFile(base64.b64decode(b64_payload, validate=True), name=filename)
    except (ValueError, binascii.Error):
        return filename, None, mime
    return filename, content, mime


def apply_signature_update(ticket, data_url: str, signer: str | None, *, touch_updated_at: bool) -> bool:
    # Save a signature file from a data URL payload.
    filename, content, mime = data_url_to_content(
        data_url,
        f"signature_{ticket.id}_{uuid.uuid4().hex}",
    )
    if not content:
        return False
    ticket.signature_file.save(filename, content, save=False)
    ticket.signature_mime = mime or ''
    ticket.signature_name = filename
    update_fields = ['signature_file', 'signature_mime', 'signature_name']
    if signer is not None:
        ticket.signature_signer = signer
        update_fields.append('signature_signer')
    if touch_updated_at:
        ticket.updated_at = timezone.now()
        update_fields.append('updated_at')
    ticket.save(update_fields=update_fields)
    return True


def employee_for_user(user):
    if not user or not user.is_authenticated:
        return None
    email = (user.email or user.username or '').strip()
    if not email:
        return None
    # Match by email to the employee profile.
    return Employee.objects.filter(email__iexact=email).first()


def group_includes_employee(group, employee_id: str, prefetched: bool = False) -> bool:
    if group.include_all_employees:
        # Use prefetched data when available to avoid extra queries.
        if prefetched:
            excluded = {e.id for e in group.excluded_employees.all()}
        else:
            excluded = set(group.excluded_employees.values_list('id', flat=True))
        return employee_id not in excluded
    if prefetched:
        return employee_id in {e.id for e in group.employees.all()}
    return group.employees.filter(id=employee_id).exists()


def group_allowed_form_ids(group, all_form_ids, prefetched: bool = False):
    if group.include_all_forms:
        # Exclude forms based on the group rules.
        if prefetched:
            excluded = {f.id for f in group.excluded_forms.all()}
        else:
            excluded = set(group.excluded_forms.values_list('id', flat=True))
        return set(all_form_ids) - excluded
    if prefetched:
        return {f.id for f in group.forms.all()}
    return set(group.forms.values_list('id', flat=True))


def allowed_form_ids_for_employee(employee, forms_qs=None):
    all_forms_qs = forms_qs or FormTemplate.objects.all()
    all_form_ids = set(all_forms_qs.values_list('id', flat=True))
    if not all_form_ids:
        return set()
    # Prefetch all related data in a single query.
    groups = access_group_queryset().all()
    allowed = set()
    for group in groups:
        if group_includes_employee(group, employee.id, prefetched=True):
            allowed.update(group_allowed_form_ids(group, all_form_ids, prefetched=True))
    return allowed


def employee_has_form_access(employee, form) -> bool:
    # Fast-path with prefetched relations to avoid N+1 queries.
    groups = access_group_queryset().all()
    for group in groups:
        if group_includes_employee(group, employee.id, prefetched=True):
            if form.id in group_allowed_form_ids(group, {form.id}, prefetched=True):
                return True
    return False


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'ok': True})


class MeView(APIView):
    def get(self, request):
        user = request.user
        role = 'admin' if is_admin(user) else 'worker'
        return Response({'email': user.email or user.username, 'role': role})


class FormListCreateView(APIView):
    def get(self, request):
        forms = form_queryset().all()
        if not is_admin(request.user):
            employee = employee_for_user(request.user)
            if not employee:
                return Response([])
            allowed_ids = allowed_form_ids_for_employee(employee, forms)
            if not allowed_ids:
                return Response([])
            forms = forms.filter(id__in=allowed_ids)
        return Response(serialize_forms(forms, request))

    @admin_required
    def post(self, request):
        name = (request.data.get('name') or 'New Form').strip()
        subtitle = (request.data.get('subtitle') or '').strip()
        form = FormTemplate.objects.create(name=name, subtitle=subtitle)
        FormVersion.objects.create(form=form, version='v1.0', status='draft', fields=[])
        # Re-fetch with versions prefetched for serialization.
        form = form_queryset().get(pk=form.pk)
        return Response(serialize_form(form, request), status=status.HTTP_201_CREATED)


class FormDetailView(APIView):
    @admin_required
    def patch(self, request, form_id):
        form = get_object_or_404(form_queryset(), pk=form_id)
        update_fields = []
        if 'name' in request.data:
            form.name = request.data['name']
            update_fields.append('name')
        if 'subtitle' in request.data:
            form.subtitle = request.data['subtitle']
            update_fields.append('subtitle')
        if update_fields:
            form.save(update_fields=update_fields)
        return Response(serialize_form(form, request))


class FormArchiveView(APIView):
    @admin_required
    def post(self, request, form_id):
        form = get_object_or_404(FormTemplate, pk=form_id)
        FormVersion.objects.filter(form=form).update(status='archived')
        # Re-fetch with versions prefetched for serialization.
        form = form_queryset().get(pk=form_id)
        return Response(serialize_form(form, request))


class FormVersionCreateView(APIView):
    @admin_required
    def post(self, request, form_id):
        form = get_object_or_404(FormTemplate, pk=form_id)
        latest = FormVersion.objects.filter(form=form).order_by('-created_at').first()
        next_version = bump_version(latest.version if latest else 'v1.0')
        pdf_file = latest.pdf if latest and latest.pdf else None
        pdf_name = latest.pdf_name if pdf_file else ''
        pdf_mime = latest.pdf_mime if pdf_file else ''
        FormVersion.objects.create(
            form=form,
            version=next_version,
            status='draft',
            fields=clone_fields(latest.fields if latest else []),
            pdf=pdf_file,
            pdf_name=pdf_name,
            pdf_mime=pdf_mime,
        )
        form = form_queryset().get(pk=form_id)
        return Response(serialize_form(form, request), status=status.HTTP_201_CREATED)


class FormVersionPublishView(APIView):
    @admin_required
    def post(self, request, form_id, version_id):
        form = get_object_or_404(FormTemplate, pk=form_id)
        FormVersion.objects.filter(form=form, status='active').update(status='archived')
        version = get_object_or_404(FormVersion, pk=version_id, form=form)
        version.status = 'active'
        version.published_at = timezone.now()
        version.save(update_fields=['status', 'published_at'])
        # Re-fetch with versions prefetched for serialization.
        form = form_queryset().get(pk=form_id)
        return Response(serialize_form(form, request))


class FormVersionPdfUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @admin_required
    def post(self, request, form_id, version_id):
        version = get_object_or_404(FormVersion, pk=version_id, form_id=form_id)
        pdf = request.FILES.get('file')
        if not pdf:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        version.pdf = pdf
        version.pdf_name = pdf.name
        version.pdf_mime = pdf.content_type or 'application/pdf'
        version.save(update_fields=['pdf', 'pdf_name', 'pdf_mime'])
        form = form_queryset().get(pk=form_id)
        return Response(serialize_form(form, request))


class FormVersionFieldUpsertView(APIView):
    parser_classes = [JSONParser]

    @admin_required
    def post(self, request, form_id, version_id):
        version = get_object_or_404(FormVersion, pk=version_id, form_id=form_id)
        field = request.data.get('field')
        if not field or 'id' not in field:
            return Response({'detail': 'Field payload required'}, status=status.HTTP_400_BAD_REQUEST)
        fields = list(version.fields or [])
        idx = next((i for i, f in enumerate(fields) if f.get('id') == field['id']), None)
        if idx is None:
            fields.append(field)
        else:
            fields[idx] = field
        version.fields = fields
        version.save(update_fields=['fields'])
        form = form_queryset().get(pk=form_id)
        return Response(serialize_form(form, request))


class FormVersionFieldDeleteView(APIView):
    @admin_required
    def delete(self, request, form_id, version_id, field_id):
        version = get_object_or_404(FormVersion, pk=version_id, form_id=form_id)
        version.fields = [f for f in (version.fields or []) if f.get('id') != field_id]
        version.save(update_fields=['fields'])
        form = form_queryset().get(pk=form_id)
        return Response(serialize_form(form, request))


class TicketListCreateView(APIView):
    def get(self, request):
        tickets = ticket_queryset().all()
        if not is_admin(request.user):
            employee = employee_for_user(request.user)
            if not employee:
                return Response([])
            allowed_ids = allowed_form_ids_for_employee(employee)
            if not allowed_ids:
                return Response([])
            tickets = tickets.filter(form_id__in=allowed_ids)
        return Response(serialize_tickets(tickets, request))

    def post(self, request):
        form_id = request.data.get('formId')
        version_id = request.data.get('versionId')
        title = (request.data.get('title') or 'Ticket').strip()
        assigned_to = (request.data.get('assignedTo') or 'Technician').strip()
        if not form_id or not version_id:
            return Response({'detail': 'formId and versionId required'}, status=status.HTTP_400_BAD_REQUEST)
        form = get_object_or_404(FormTemplate, pk=form_id)
        if not is_admin(request.user):
            employee = employee_for_user(request.user)
            if not employee:
                return Response({'detail': 'Employee profile required'}, status=status.HTTP_403_FORBIDDEN)
            if not employee_has_form_access(employee, form):
                return Response({'detail': 'No access to form'}, status=status.HTTP_403_FORBIDDEN)
        version = get_object_or_404(FormVersion, pk=version_id, form=form)
        ticket = Ticket.objects.create(
            title=title,
            form=form,
            version=version,
            assigned_to=assigned_to,
            status='pending',
            approval_state='approved',
        )
        return Response(serialize_ticket(ticket, request), status=status.HTTP_201_CREATED)


class TicketDetailView(APIView):
    def get(self, request, ticket_id):
        ticket = get_object_or_404(ticket_queryset(), pk=ticket_id)
        return Response(serialize_ticket(ticket, request))

    def patch(self, request, ticket_id):
        ticket = get_object_or_404(ticket_queryset(), pk=ticket_id)
        serializer = TicketUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.update(ticket, serializer.validated_data)

        # Handle optional signature update from the payload.
        sig = request.data.get('signature') or {}
        if sig.get('dataUrl'):
            apply_signature_update(
                ticket,
                sig.get('dataUrl'),
                sig.get('signer', ticket.signature_signer),
                touch_updated_at=False,
            )

        # Re-fetch with prefetched relations for serialization.
        ticket = ticket_queryset().get(pk=ticket_id)
        return Response(serialize_ticket(ticket, request))


class TicketSubmitView(APIView):
    def post(self, request, ticket_id):
        ticket = get_object_or_404(ticket_queryset(), pk=ticket_id)
        ticket.status = 'synced'
        ticket.last_error = ''
        ticket.approval_state = 'approved'
        ticket.updated_at = timezone.now()
        ticket.save(update_fields=['status', 'last_error', 'approval_state', 'updated_at'])
        return Response(serialize_ticket(ticket, request))


class TicketApproveView(APIView):
    @admin_required
    def post(self, request, ticket_id):
        ticket = get_object_or_404(ticket_queryset(), pk=ticket_id)
        ticket.approval_state = 'approved'
        ticket.updated_at = timezone.now()
        ticket.save(update_fields=['approval_state', 'updated_at'])
        return Response(serialize_ticket(ticket, request))


class TicketAttachmentUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        Attachment.objects.create(
            ticket=ticket,
            file=upload,
            name=upload.name,
            mime=upload.content_type or 'application/octet-stream'
        )
        # Re-fetch with prefetched relations for serialization.
        ticket = ticket_queryset().get(pk=ticket_id)
        return Response(serialize_ticket(ticket, request))


class TicketSignatureUploadView(APIView):
    parser_classes = [JSONParser]

    def post(self, request, ticket_id):
        ticket = get_object_or_404(ticket_queryset(), pk=ticket_id)
        data_url = request.data.get('dataUrl')
        signer = request.data.get('signer', '')
        if not data_url:
            return Response({'detail': 'dataUrl required'}, status=status.HTTP_400_BAD_REQUEST)
        if not apply_signature_update(ticket, data_url, signer, touch_updated_at=True):
            return Response({'detail': 'Invalid dataUrl'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_ticket(ticket, request))


class EmployeeListCreateView(APIView):
    def get(self, request):
        employees = Employee.objects.all()
        return Response(EmployeeSerializer(employees, many=True).data)

    @admin_required
    def post(self, request):
        serializer = EmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.save()
        return Response(EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED)


class EmployeeDetailView(APIView):
    def get(self, request, employee_id):
        employee = get_object_or_404(Employee, pk=employee_id)
        return Response(EmployeeSerializer(employee).data)

    @admin_required
    def patch(self, request, employee_id):
        employee = get_object_or_404(Employee, pk=employee_id)
        serializer = EmployeeSerializer(employee, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        employee = serializer.save()
        return Response(EmployeeSerializer(employee).data)

    @admin_required
    def delete(self, request, employee_id):
        employee = get_object_or_404(Employee, pk=employee_id)
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccessGroupListCreateView(APIView):
    @admin_required
    def get(self, request):
        groups = access_group_queryset().all()
        return Response(AccessGroupSerializer(groups, many=True).data)

    @admin_required
    def post(self, request):
        serializer = AccessGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = serializer.save()
        return Response(AccessGroupSerializer(group).data, status=status.HTTP_201_CREATED)


class AccessGroupDetailView(APIView):
    @admin_required
    def get(self, request, group_id):
        group = get_object_or_404(
            access_group_queryset(),
            pk=group_id
        )
        return Response(AccessGroupSerializer(group).data)

    @admin_required
    def patch(self, request, group_id):
        group = get_object_or_404(AccessGroup, pk=group_id)
        serializer = AccessGroupSerializer(group, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        group = serializer.save()
        return Response(AccessGroupSerializer(group).data)

    @admin_required
    def delete(self, request, group_id):
        group = get_object_or_404(AccessGroup, pk=group_id)
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
