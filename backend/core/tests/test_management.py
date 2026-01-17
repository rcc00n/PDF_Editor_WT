import os
from unittest import mock

from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.test import TestCase


class SeedInitialCommandTests(TestCase):
    def test_seed_initial_creates_users_and_groups(self):
        env = {
            'ADMIN_EMAIL': 'admin@example.com',
            'ADMIN_PASSWORD': 'admin-pass',
            'WORKER_EMAIL': 'worker@example.com',
            'WORKER_PASSWORD': 'worker-pass',
        }
        with mock.patch.dict(os.environ, env, clear=False):
            call_command('seed_initial')

        self.assertTrue(Group.objects.filter(name='admin').exists())
        self.assertTrue(Group.objects.filter(name='worker').exists())

        admin = User.objects.get(username='admin@example.com')
        worker = User.objects.get(username='worker@example.com')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.groups.filter(name='admin').exists())
        self.assertTrue(worker.groups.filter(name='worker').exists())

    def test_seed_initial_no_env_no_users(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            call_command('seed_initial')
        self.assertEqual(User.objects.count(), 0)

    def test_seed_initial_adds_missing_groups(self):
        admin = User.objects.create_user('admin@example.com', email='admin@example.com', password='pass')
        worker = User.objects.create_user('worker@example.com', email='worker@example.com', password='pass')
        env = {
            'ADMIN_EMAIL': 'admin@example.com',
            'ADMIN_PASSWORD': 'admin-pass',
            'WORKER_EMAIL': 'worker@example.com',
            'WORKER_PASSWORD': 'worker-pass',
        }
        with mock.patch.dict(os.environ, env, clear=False):
            call_command('seed_initial')
        admin.refresh_from_db()
        worker.refresh_from_db()
        self.assertTrue(admin.groups.filter(name='admin').exists())
        self.assertTrue(worker.groups.filter(name='worker').exists())
