import re
import shutil
import tempfile
import uuid
from unittest import mock
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import TestCase, override_settings

from core import models
from core.models import AccessGroup, Attachment, Employee, FormTemplate, FormVersion, Ticket


class ModelUtilityTests(TestCase):
    def setUp(self):
        super().setUp()
        self.form = FormTemplate.objects.create(name='Safety Form', subtitle='Checklist')
        self.version = FormVersion.objects.create(form=self.form, version='v1.0', status='draft', fields=[])

    def test_uid_helpers_use_prefixes(self):
        fixed_uuid = uuid.UUID('12345678-1234-5678-1234-567812345678')
        with mock.patch('core.models.uuid.uuid4', return_value=fixed_uuid):
            self.assertEqual(models.uid('abc'), 'abc_1234567812')
            self.assertEqual(models.form_uid(), 'form_1234567812')
            self.assertEqual(models.version_uid(), 'ver_1234567812')
            self.assertEqual(models.employee_uid(), 'emp_1234567812')
            self.assertEqual(models.group_uid(), 'grp_1234567812')

    def test_next_ticket_id_increments(self):
        self.assertEqual(models.next_ticket_id(), 'FT-0001')
        Ticket.objects.create(
            id='FT-0001',
            title='Existing',
            form=self.form,
            version=self.version,
            assigned_to='Tech'
        )
        self.assertEqual(models.next_ticket_id(), 'FT-0002')

    def test_ticket_save_assigns_id(self):
        ticket = Ticket(
            title='Leak Check',
            form=self.form,
            version=self.version,
            assigned_to='Tech'
        )
        ticket.save()
        self.assertTrue(re.match(r'^FT-\d{4}$', ticket.id))

    def test_ticket_save_retries_and_errors_on_collision(self):
        Ticket.objects.create(
            id='FT-0001',
            title='Existing',
            form=self.form,
            version=self.version,
            assigned_to='Tech'
        )
        with mock.patch('core.models.next_ticket_id', return_value='FT-0001'):
            with self.assertRaises(IntegrityError):
                Ticket.objects.create(
                    title='Collision',
                    form=self.form,
                    version=self.version,
                    assigned_to='Tech'
                )

    def test_ticket_save_sets_updated_at_when_missing(self):
        ticket = Ticket.objects.create(
            title='Needs Timestamp',
            form=self.form,
            version=self.version,
            assigned_to='Tech'
        )
        ticket.updated_at = None
        ticket.save()
        self.assertIsNotNone(ticket.updated_at)


class ModelStrTests(TestCase):
    def setUp(self):
        super().setUp()
        self.media_dir = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.media_dir, ignore_errors=True))

        self.form = FormTemplate.objects.create(name='Audit', subtitle='Weekly')
        self.version = FormVersion.objects.create(form=self.form, version='v1.0', status='draft', fields=[])
        self.ticket = Ticket.objects.create(
            title='Shift Report',
            form=self.form,
            version=self.version,
            assigned_to='Tech'
        )

    def test_str_methods(self):
        employee = Employee.objects.create(name='Taylor', email='taylor@example.com')
        group = AccessGroup.objects.create(name='Field Ops', description='Ops')
        group.employees.add(employee)
        group.forms.add(self.form)
        attachment = Attachment.objects.create(
            ticket=self.ticket,
            file=SimpleUploadedFile('note.txt', b'notes', content_type='text/plain'),
            name='note.txt',
            mime='text/plain'
        )
        self.assertEqual(str(self.form), 'Audit')
        self.assertEqual(str(self.version), 'Audit v1.0')
        self.assertEqual(str(self.ticket), self.ticket.id)
        self.assertEqual(str(attachment), 'note.txt')
        self.assertEqual(str(employee), 'Taylor')
        self.assertEqual(str(group), 'Field Ops')
