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
