import base64
import shutil
import tempfile
from unittest import mock

from django.contrib.auth.models import AnonymousUser, User
from django.test import TestCase, override_settings

from core.models import AccessGroup, Employee, FormTemplate
from core.views import (
    allowed_form_ids_for_employee,
    bump_version,
    clone_fields,
    data_url_to_content,
    employee_for_user,
    employee_has_form_access,
    group_allowed_form_ids,
    group_includes_employee,
)


class ViewUtilityTests(TestCase):
    def setUp(self):
        super().setUp()
        self.media_dir = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.media_dir, ignore_errors=True))

        self.employee = Employee.objects.create(name='Pat', email='pat@example.com')
        self.other_employee = Employee.objects.create(name='Sam', email='sam@example.com')
        self.form_a = FormTemplate.objects.create(name='Form A', subtitle='')
        self.form_b = FormTemplate.objects.create(name='Form B', subtitle='')

    def test_bump_version(self):
        self.assertEqual(bump_version('v1.2'), 'v1.3')
        self.assertEqual(bump_version('V2.9'), 'v2.10')
        self.assertEqual(bump_version('bad'), 'v1.0')

    def test_clone_fields_assigns_new_ids(self):
        fields = [{'id': 'fld_old', 'label': 'Name'}]
        with mock.patch('core.views.uid', side_effect=['fld_new']):
            cloned = clone_fields(fields)
        self.assertEqual(cloned[0]['label'], 'Name')
        self.assertNotEqual(cloned[0]['id'], 'fld_old')

    def test_data_url_to_content(self):
        data = base64.b64encode(b'hello').decode('ascii')
        data_url = f"data:text/plain;base64,{data}"
        filename, content, mime = data_url_to_content(data_url, 'greeting')
        self.assertEqual(mime, 'text/plain')
        self.assertTrue(filename.startswith('greeting'))
        self.assertEqual(content.read(), b'hello')

    def test_data_url_to_content_empty(self):
        self.assertEqual(data_url_to_content('', 'file'), (None, None, None))

    def test_data_url_to_content_without_header(self):
        data = base64.b64encode(b'hi').decode('ascii')
        filename, content, mime = data_url_to_content(data, 'plain')
        self.assertEqual(mime, 'application/octet-stream')
        self.assertTrue(filename.startswith('plain'))
        self.assertEqual(content.read(), b'hi')

    def test_employee_for_user(self):
        self.assertIsNone(employee_for_user(None))
        self.assertIsNone(employee_for_user(AnonymousUser()))
        user = User.objects.create_user('pat@example.com', email='pat@example.com', password='pass')
        self.assertEqual(employee_for_user(user), self.employee)

    def test_employee_for_user_blank_email(self):
        user = User.objects.create_user('   ', email='', password='pass')
        self.assertIsNone(employee_for_user(user))

    def test_group_includes_employee_with_includes(self):
        group = AccessGroup.objects.create(name='Group', description='', include_all_employees=False)
        group.employees.add(self.employee)
        self.assertTrue(group_includes_employee(group, self.employee.id, prefetched=False))
        self.assertTrue(group_includes_employee(group, self.employee.id, prefetched=True))
        self.assertFalse(group_includes_employee(group, self.other_employee.id, prefetched=False))

    def test_group_includes_employee_with_exclusions(self):
        group = AccessGroup.objects.create(name='Group', description='', include_all_employees=True)
        group.excluded_employees.add(self.other_employee)
        self.assertTrue(group_includes_employee(group, self.employee.id, prefetched=False))
        self.assertFalse(group_includes_employee(group, self.other_employee.id, prefetched=False))

    def test_group_allowed_form_ids_with_includes(self):
        group = AccessGroup.objects.create(name='Group', description='', include_all_forms=False)
        group.forms.add(self.form_a)
        allowed = group_allowed_form_ids(group, {self.form_a.id, self.form_b.id}, prefetched=False)
        self.assertEqual(allowed, {self.form_a.id})

    def test_group_allowed_form_ids_with_exclusions(self):
        group = AccessGroup.objects.create(name='Group', description='', include_all_forms=True)
        group.excluded_forms.add(self.form_b)
        allowed = group_allowed_form_ids(group, {self.form_a.id, self.form_b.id}, prefetched=False)
        self.assertEqual(allowed, {self.form_a.id})

    def test_group_allowed_form_ids_with_prefetched_exclusions(self):
        group = AccessGroup.objects.create(name='Group', description='', include_all_forms=True)
        group.excluded_forms.add(self.form_b)
        allowed = group_allowed_form_ids(group, {self.form_a.id, self.form_b.id}, prefetched=True)
        self.assertEqual(allowed, {self.form_a.id})

    def test_allowed_form_ids_for_employee(self):
        group = AccessGroup.objects.create(name='Group', description='', include_all_employees=False, include_all_forms=False)
        group.employees.add(self.employee)
        group.forms.add(self.form_a)
        allowed = allowed_form_ids_for_employee(self.employee)
        self.assertEqual(allowed, {self.form_a.id})

    def test_allowed_form_ids_for_employee_no_forms(self):
        FormTemplate.objects.all().delete()
        allowed = allowed_form_ids_for_employee(self.employee)
        self.assertEqual(allowed, set())

    def test_employee_has_form_access(self):
        group = AccessGroup.objects.create(name='Group', description='', include_all_employees=True, include_all_forms=True)
        group.excluded_forms.add(self.form_b)
        self.assertTrue(employee_has_form_access(self.employee, self.form_a))
        self.assertFalse(employee_has_form_access(self.employee, self.form_b))
