import base64
import shutil
import tempfile
from unittest import mock

from django.contrib.auth.models import Group, User
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from core.models import AccessGroup, Employee, FormTemplate, FormVersion, Ticket


class BaseAPITestCase(APITestCase):
    def setUp(self):
        super().setUp()
        self.media_dir = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.media_dir, ignore_errors=True))

        self.admin_group = Group.objects.create(name='admin')
        self.worker_group = Group.objects.create(name='worker')

        self.admin_user = User.objects.create_user('admin@example.com', email='admin@example.com', password='pass')
        self.admin_user.is_staff = True
        self.admin_user.save()

        self.worker_user = User.objects.create_user('worker@example.com', email='worker@example.com', password='pass')
        self.worker_user.groups.add(self.worker_group)

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin_user)

        self.worker_client = APIClient()
        self.worker_client.force_authenticate(self.worker_user)

        self.anon_client = APIClient()

    def create_form_with_version(self, name='Form', version='v1.0', status='draft', fields=None):
        form = FormTemplate.objects.create(name=name, subtitle='')
        version_obj = FormVersion.objects.create(form=form, version=version, status=status, fields=fields or [])
        return form, version_obj

    def create_ticket(self, form=None, version=None, title='Ticket', assigned_to='Tech'):
        if not form or not version:
            form, version = self.create_form_with_version()
        return Ticket.objects.create(
            title=title,
            form=form,
            version=version,
            assigned_to=assigned_to,
            status='pending',
            approval_state='pending'
        )

    def create_access_group(
        self,
        name='Group',
        include_all_employees=False,
        include_all_forms=False,
        employees=None,
        forms=None,
        excluded_employees=None,
        excluded_forms=None,
    ):
        group = AccessGroup.objects.create(
            name=name,
            description='',
            include_all_employees=include_all_employees,
            include_all_forms=include_all_forms,
        )
        if employees:
            group.employees.set(employees)
        if forms:
            group.forms.set(forms)
        if excluded_employees:
            group.excluded_employees.set(excluded_employees)
        if excluded_forms:
            group.excluded_forms.set(excluded_forms)
        return group


class HealthAndAuthTests(BaseAPITestCase):
    def test_health_allows_anonymous(self):
        response = self.anon_client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'ok': True})

    def test_me_requires_auth(self):
        response = self.anon_client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_roles(self):
        response = self.admin_client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'admin')
        response = self.worker_client.get('/api/auth/me/')
        self.assertEqual(response.data['role'], 'worker')

    def test_token_obtain_and_refresh(self):
        response = self.anon_client.post(
            '/api/auth/token/',
            {'username': 'admin@example.com', 'password': 'pass'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        refresh = response.data['refresh']
        refresh_response = self.anon_client.post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)

    def test_token_obtain_invalid_credentials(self):
        response = self.anon_client.post(
            '/api/auth/token/',
            {'username': 'admin@example.com', 'password': 'wrong'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class FormEndpointsTests(BaseAPITestCase):
    def test_form_list_admin_sees_all(self):
        form_a, _ = self.create_form_with_version(name='Form A')
        form_b, _ = self.create_form_with_version(name='Form B')
        response = self.admin_client.get('/api/forms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [form['id'] for form in response.data]
        self.assertCountEqual(ids, [form_a.id, form_b.id])

    def test_form_list_worker_filters_without_employee(self):
        self.create_form_with_version(name='Form A')
        response = self.worker_client.get('/api/forms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_form_list_worker_with_access(self):
        employee = Employee.objects.create(name='Worker', email='worker@example.com')
        form_a, _ = self.create_form_with_version(name='Form A')
        form_b, _ = self.create_form_with_version(name='Form B')
        self.create_access_group(
            name='Allowed',
            include_all_employees=False,
            include_all_forms=False,
            employees=[employee],
            forms=[form_a],
        )
        response = self.worker_client.get('/api/forms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [form['id'] for form in response.data]
        self.assertEqual(ids, [form_a.id])

    def test_form_list_worker_with_no_allowed_forms(self):
        employee = Employee.objects.create(name='Worker', email='worker@example.com')
        form, _ = self.create_form_with_version(name='Form A')
        self.create_access_group(
            name='Excluded',
            include_all_employees=True,
            include_all_forms=True,
            excluded_forms=[form],
        )
        response = self.worker_client.get('/api/forms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_form_create_admin(self):
        response = self.admin_client.post('/api/forms/', {'name': 'New Form', 'subtitle': 'Sub'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Form')
        self.assertEqual(len(response.data['versions']), 1)

    def test_form_create_non_admin_forbidden(self):
        response = self.worker_client.post('/api/forms/', {'name': 'Nope'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_form_patch_admin(self):
        form, _ = self.create_form_with_version(name='Old')
        response = self.admin_client.patch(
            f'/api/forms/{form.id}/',
            {'name': 'Updated', 'subtitle': 'New Subtitle'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated')

    def test_form_archive_admin(self):
        form, version = self.create_form_with_version()
        response = self.admin_client.post(f'/api/forms/{form.id}/archive/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version.refresh_from_db()
        self.assertEqual(version.status, 'archived')

    def test_form_version_create_clones_latest(self):
        form, version = self.create_form_with_version(fields=[{'id': 'fld_old', 'label': 'Name'}])
        upload = SimpleUploadedFile('guide.pdf', b'pdf', content_type='application/pdf')
        version.pdf = upload
        version.pdf_name = 'guide.pdf'
        version.pdf_mime = 'application/pdf'
        version.pdf.save(upload.name, upload)
        response = self.admin_client.post(f'/api/forms/{form.id}/versions/', format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        versions = response.data['versions']
        self.assertEqual(len(versions), 2)
        new_version = FormVersion.objects.filter(form=form).order_by('-created_at').first()
        self.assertEqual(new_version.version, 'v1.1')
        self.assertEqual(new_version.pdf_name, 'guide.pdf')
        self.assertEqual(new_version.pdf_mime, 'application/pdf')
        self.assertNotEqual(new_version.fields[0]['id'], version.fields[0]['id'])

    def test_form_version_publish(self):
        form, v1 = self.create_form_with_version(version='v1.0', status='active')
        v2 = FormVersion.objects.create(form=form, version='v1.1', status='draft', fields=[])
        response = self.admin_client.post(f'/api/forms/{form.id}/versions/{v2.id}/publish/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        v1.refresh_from_db()
        v2.refresh_from_db()
        self.assertEqual(v1.status, 'archived')
        self.assertEqual(v2.status, 'active')
        self.assertIsNotNone(v2.published_at)

    def test_form_version_pdf_upload(self):
        form, version = self.create_form_with_version()
        response = self.admin_client.post(f'/api/forms/{form.id}/versions/{version.id}/pdf/', format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        upload = SimpleUploadedFile('doc.pdf', b'pdf', content_type='application/pdf')
        response = self.admin_client.post(
            f'/api/forms/{form.id}/versions/{version.id}/pdf/',
            {'file': upload},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version.refresh_from_db()
        self.assertEqual(version.pdf_name, 'doc.pdf')

    def test_form_version_field_upsert_and_delete(self):
        form, version = self.create_form_with_version(fields=[])
        response = self.admin_client.post(
            f'/api/forms/{form.id}/versions/{version.id}/fields/',
            {},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        field = {'id': 'fld_1', 'label': 'Serial'}
        response = self.admin_client.post(
            f'/api/forms/{form.id}/versions/{version.id}/fields/',
            {'field': field},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version.refresh_from_db()
        self.assertEqual(version.fields, [field])

        updated = {'id': 'fld_1', 'label': 'Serial No.'}
        response = self.admin_client.post(
            f'/api/forms/{form.id}/versions/{version.id}/fields/',
            {'field': updated},
            format='json'
        )
        version.refresh_from_db()
        self.assertEqual(version.fields, [updated])

        response = self.admin_client.delete(
            f'/api/forms/{form.id}/versions/{version.id}/fields/{updated["id"]}/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version.refresh_from_db()
        self.assertEqual(version.fields, [])
