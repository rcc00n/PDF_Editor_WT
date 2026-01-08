import base64
import mimetypes
import uuid
from django.utils import timezone
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from .models import FormTemplate, FormVersion, Ticket, Attachment, uid
from .serializers import FormTemplateSerializer, TicketSerializer, TicketUpdateSerializer
from .permissions import is_admin


def bump_version(current: str) -> str:
    try:
        v = current.lstrip('vV')
        major, minor = v.split('.', 1)
        return f"v{int(major)}.{int(minor) + 1}"
    except Exception:
        return 'v1.0'


def clone_fields(fields):
    cloned = []
    for f in fields or []:
        next_field = dict(f)
        next_field['id'] = uid('fld')
        cloned.append(next_field)
    return cloned


def data_url_to_content(data_url: str, fallback_name: str):
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
    return filename, ContentFile(base64.b64decode(b64), name=filename), mime


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
        forms = FormTemplate.objects.prefetch_related('versions').all()
        return Response(FormTemplateSerializer(forms, many=True, context={'request': request}).data)

    def post(self, request):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        name = (request.data.get('name') or 'New Form').strip()
        subtitle = (request.data.get('subtitle') or '').strip()
        form = FormTemplate.objects.create(name=name, subtitle=subtitle)
        FormVersion.objects.create(form=form, version='v1.0', status='draft', fields=[])
        form.refresh_from_db()
        return Response(FormTemplateSerializer(form, context={'request': request}).data, status=status.HTTP_201_CREATED)


class FormDetailView(APIView):
    def patch(self, request, form_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        form = get_object_or_404(FormTemplate, pk=form_id)
        if 'name' in request.data:
            form.name = request.data['name']
        if 'subtitle' in request.data:
            form.subtitle = request.data['subtitle']
        form.save()
        return Response(FormTemplateSerializer(form, context={'request': request}).data)


class FormArchiveView(APIView):
    def post(self, request, form_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        form = get_object_or_404(FormTemplate, pk=form_id)
        FormVersion.objects.filter(form=form).update(status='archived')
        form.refresh_from_db()
        return Response(FormTemplateSerializer(form, context={'request': request}).data)


class FormVersionCreateView(APIView):
    def post(self, request, form_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        form = get_object_or_404(FormTemplate, pk=form_id)
        latest = FormVersion.objects.filter(form=form).order_by('-created_at').first()
        next_version = bump_version(latest.version if latest else 'v1.0')
        FormVersion.objects.create(
            form=form,
            version=next_version,
            status='draft',
            fields=clone_fields(latest.fields if latest else [])
        )
        form = FormTemplate.objects.prefetch_related('versions').get(pk=form_id)
        return Response(FormTemplateSerializer(form, context={'request': request}).data, status=status.HTTP_201_CREATED)


class FormVersionPublishView(APIView):
    def post(self, request, form_id, version_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        form = get_object_or_404(FormTemplate, pk=form_id)
        FormVersion.objects.filter(form=form, status='active').update(status='archived')
        version = get_object_or_404(FormVersion, pk=version_id, form=form)
        version.status = 'active'
        version.published_at = timezone.now()
        version.save()
        form.refresh_from_db()
        return Response(FormTemplateSerializer(form, context={'request': request}).data)


class FormVersionPdfUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, form_id, version_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        version = get_object_or_404(FormVersion, pk=version_id, form_id=form_id)
        pdf = request.FILES.get('file')
        if not pdf:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        version.pdf = pdf
        version.pdf_name = pdf.name
        version.pdf_mime = pdf.content_type or 'application/pdf'
        version.save()
        form = get_object_or_404(FormTemplate, pk=form_id)
        return Response(FormTemplateSerializer(form, context={'request': request}).data)


class FormVersionFieldUpsertView(APIView):
    parser_classes = [JSONParser]

    def post(self, request, form_id, version_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
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
        version.save()
        form = get_object_or_404(FormTemplate, pk=form_id)
        return Response(FormTemplateSerializer(form, context={'request': request}).data)


class FormVersionFieldDeleteView(APIView):
    def delete(self, request, form_id, version_id, field_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        version = get_object_or_404(FormVersion, pk=version_id, form_id=form_id)
        version.fields = [f for f in (version.fields or []) if f.get('id') != field_id]
        version.save()
        form = get_object_or_404(FormTemplate, pk=form_id)
        return Response(FormTemplateSerializer(form, context={'request': request}).data)


class TicketListCreateView(APIView):
    def get(self, request):
        tickets = Ticket.objects.select_related('form', 'version').prefetch_related('attachments').all()
        return Response(TicketSerializer(tickets, many=True, context={'request': request}).data)

    def post(self, request):
        form_id = request.data.get('formId')
        version_id = request.data.get('versionId')
        title = (request.data.get('title') or 'Ticket').strip()
        assigned_to = (request.data.get('assignedTo') or 'Technician').strip()
        if not form_id or not version_id:
            return Response({'detail': 'formId and versionId required'}, status=status.HTTP_400_BAD_REQUEST)
        form = get_object_or_404(FormTemplate, pk=form_id)
        version = get_object_or_404(FormVersion, pk=version_id, form=form)
        ticket = Ticket.objects.create(
            title=title,
            form=form,
            version=version,
            assigned_to=assigned_to,
            status='pending',
            approval_state='pending',
        )
        return Response(TicketSerializer(ticket, context={'request': request}).data, status=status.HTTP_201_CREATED)


class TicketDetailView(APIView):
    def get(self, request, ticket_id):
        ticket = get_object_or_404(Ticket.objects.select_related('form', 'version').prefetch_related('attachments'), pk=ticket_id)
        return Response(TicketSerializer(ticket, context={'request': request}).data)

    def patch(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        serializer = TicketUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(ticket, serializer.validated_data)
        sig = request.data.get('signature')
        if sig and sig.get('dataUrl'):
            filename, content, mime = data_url_to_content(sig.get('dataUrl'), f"signature_{ticket.id}_{uuid.uuid4().hex}")
            if content:
                ticket.signature_file.save(filename, content, save=False)
                ticket.signature_mime = mime or ''
                ticket.signature_name = filename
                ticket.signature_signer = sig.get('signer', ticket.signature_signer)
                ticket.save()
        return Response(TicketSerializer(ticket, context={'request': request}).data)


class TicketSubmitView(APIView):
    def post(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        ticket.status = 'synced'
        ticket.last_error = ''
        ticket.updated_at = timezone.now()
        ticket.save()
        return Response(TicketSerializer(ticket, context={'request': request}).data)


class TicketApproveView(APIView):
    def post(self, request, ticket_id):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        ticket.approval_state = 'approved'
        ticket.updated_at = timezone.now()
        ticket.save()
        return Response(TicketSerializer(ticket, context={'request': request}).data)


class TicketAttachmentUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        attachment = Attachment.objects.create(
            ticket=ticket,
            file=upload,
            name=upload.name,
            mime=upload.content_type or 'application/octet-stream'
        )
        ticket.refresh_from_db()
        return Response(TicketSerializer(ticket, context={'request': request}).data)


class TicketSignatureUploadView(APIView):
    parser_classes = [JSONParser]

    def post(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        data_url = request.data.get('dataUrl')
        signer = request.data.get('signer', '')
        if not data_url:
            return Response({'detail': 'dataUrl required'}, status=status.HTTP_400_BAD_REQUEST)
        filename, content, mime = data_url_to_content(data_url, f"signature_{ticket.id}_{uuid.uuid4().hex}")
        if not content:
            return Response({'detail': 'Invalid dataUrl'}, status=status.HTTP_400_BAD_REQUEST)
        ticket.signature_file.save(filename, content, save=False)
        ticket.signature_mime = mime or ''
        ticket.signature_name = filename
        ticket.signature_signer = signer
        ticket.updated_at = timezone.now()
        ticket.save()
        return Response(TicketSerializer(ticket, context={'request': request}).data)
