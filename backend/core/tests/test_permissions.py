from django.contrib.auth.models import AnonymousUser, Group, User
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from core.permissions import IsAdminRole, is_admin


class PermissionTests(TestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.admin_group = Group.objects.create(name='admin')

    def test_is_admin_false_for_anonymous(self):
        self.assertFalse(is_admin(None))
        self.assertFalse(is_admin(AnonymousUser()))

    def test_is_admin_true_for_staff(self):
        user = User.objects.create_user('staff@example.com', email='staff@example.com', password='pass')
        user.is_staff = True
        user.save()
        self.assertTrue(is_admin(user))

    def test_is_admin_true_for_group_member(self):
        user = User.objects.create_user('group@example.com', email='group@example.com', password='pass')
        user.groups.add(self.admin_group)
        self.assertTrue(is_admin(user))

    def test_is_admin_false_for_regular_user(self):
        user = User.objects.create_user('regular@example.com', email='regular@example.com', password='pass')
        self.assertFalse(is_admin(user))

    def test_is_admin_role_permission(self):
        admin = User.objects.create_user('admin@example.com', email='admin@example.com', password='pass')
        admin.is_staff = True
        admin.save()
        request = self.factory.get('/api/forms/')
        request.user = admin
        self.assertTrue(IsAdminRole().has_permission(request, None))
