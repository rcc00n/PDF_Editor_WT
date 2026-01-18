import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from core.models import AccessGroup, Attachment, Employee, FormTemplate, FormVersion, Ticket
from core.serializers import (
    AccessGroupSerializer,
    AttachmentSerializer,
    FormTemplateSerializer,
    FormVersionSerializer,
    TicketSerializer,
    TicketUpdateSerializer,
    build_file_url,
)


class SerializerTests(TestCase):
    def setUp(self):
        super().setUp()
        self.media_dir = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.media_dir, ignore_errors=True))

        self.factory = APIRequestFactory()
        self.form = FormTemplate.objects.create(name='Inspection', subtitle='Daily')
        self.version = FormVersion.objects.create(form=self.form, version='v1.0', status='draft', fields=[{'id': 'fld_1'}])
        self.ticket = Ticket.objects.create(
            title='Pump Check',
            form=self.form,
            version=self.version,
            assigned_to='Tech',
            status='pending',
            approval_state='pending'
        )

    def test_build_file_url(self):
        self.assertIsNone(build_file_url(None, None))
        upload = SimpleUploadedFile('manual.pdf', b'pdf', content_type='application/pdf')
        self.version.pdf = upload
        self.version.pdf.save(upload.name, upload)
        url = build_file_url(None, self.version.pdf)
        self.assertTrue(url.startswith('/media/'))
        request = self.factory.get('/api/forms/')
        abs_url = build_file_url(request, self.version.pdf)
        self.assertTrue(abs_url.startswith('http://testserver/media/'))

    def test_form_version_serializer_fields_and_pdf(self):
        upload = SimpleUploadedFile('guide.pdf', b'pdf', content_type='application/pdf')
        self.version.pdf = upload
        self.version.pdf.save(upload.name, upload)
        serializer = FormVersionSerializer(self.version, context={'request': self.factory.get('/api/forms/')})
        data = serializer.data
        self.assertEqual(data['fieldCount'], 1)
        self.assertEqual(data['pdf']['name'], 'guide.pdf')
        self.assertEqual(data['pdf']['mime'], 'application/pdf')
        self.assertTrue(data['pdf']['url'].startswith('http://testserver/media/'))

    def test_form_template_serializer_includes_versions(self):
        serializer = FormTemplateSerializer(self.form)
        data = serializer.data
        self.assertEqual(data['name'], 'Inspection')
        self.assertEqual(len(data['versions']), 1)

    def test_attachment_serializer_url(self):
        upload = SimpleUploadedFile('photo.jpg', b'jpg', content_type='image/jpeg')
        attachment = Attachment.objects.create(
            ticket=self.ticket,
            file=upload,
            name='photo.jpg',
            mime='image/jpeg'
        )
        serializer = AttachmentSerializer(attachment, context={'request': self.factory.get('/api/tickets/')})
        self.assertTrue(serializer.data['url'].startswith('http://testserver/media/'))

    def test_ticket_serializer_signature(self):
        serializer = TicketSerializer(self.ticket, context={'request': self.factory.get('/api/tickets/')})
        self.assertIsNone(serializer.data['signature'])
        self.ticket.signature_signer = 'Alex'
        self.ticket.save(update_fields=['signature_signer'])
        serializer = TicketSerializer(self.ticket, context={'request': self.factory.get('/api/tickets/')})
        self.assertEqual(serializer.data['signature']['signer'], 'Alex')
        self.assertIsNone(serializer.data['signature']['url'])

    def test_ticket_update_serializer_updates_fields(self):
        before = timezone.now()
        serializer = TicketUpdateSerializer(data={
            'title': 'Updated',
            'assignedTo': 'New Tech',
            'status': 'in_progress',
            'approvalState': 'approved',
            'values': {'step': 1},
            'signature': {'signer': 'Jordan'}
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        ticket = serializer.update(self.ticket, serializer.validated_data)
        ticket.refresh_from_db()
        self.assertEqual(ticket.title, 'Updated')
        self.assertEqual(ticket.assigned_to, 'New Tech')
        self.assertEqual(ticket.status, 'in_progress')
        self.assertEqual(ticket.approval_state, 'approved')
        self.assertEqual(ticket.values, {'step': 1})
        self.assertEqual(ticket.signature_signer, 'Jordan')
        self.assertGreaterEqual(ticket.updated_at, before)

    def test_ticket_update_serializer_rejects_invalid_status(self):
        serializer = TicketUpdateSerializer(data={'status': 'not-real'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('status', serializer.errors)

    def test_access_group_serializer_maps_fields(self):
        employee = Employee.objects.create(name='Avery', email='avery@example.com')
        form = FormTemplate.objects.create(name='Safety', subtitle='')
        data = {
            'name': 'Group',
            'description': 'Desc',
            'includeAllEmployees': False,
            'includeAllForms': False,
            'employeeIds': [employee.id],
            'formIds': [form.id],
            'excludedEmployeeIds': [],
            'excludedFormIds': [],
        }
        serializer = AccessGroupSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        group = serializer.save()
        self.assertEqual(group.name, 'Group')
        self.assertFalse(group.include_all_employees)
        self.assertFalse(group.include_all_forms)
        self.assertEqual(list(group.employees.all()), [employee])
        self.assertEqual(list(group.forms.all()), [form])
