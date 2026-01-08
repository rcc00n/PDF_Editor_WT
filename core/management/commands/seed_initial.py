import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group


class Command(BaseCommand):
    help = 'Seed initial admin/worker users and role groups.'

    def handle(self, *args, **options):
        admin_group, _ = Group.objects.get_or_create(name='admin')
        worker_group, _ = Group.objects.get_or_create(name='worker')

        admin_email = os.getenv('ADMIN_EMAIL')
        admin_password = os.getenv('ADMIN_PASSWORD')
        worker_email = os.getenv('WORKER_EMAIL')
        worker_password = os.getenv('WORKER_PASSWORD')

        if admin_email and admin_password:
            admin_user, created = User.objects.get_or_create(
                username=admin_email,
                defaults={'email': admin_email}
            )
            if created:
                admin_user.set_password(admin_password)
                admin_user.is_staff = True
                admin_user.save()
                admin_user.groups.add(admin_group)
                self.stdout.write(self.style.SUCCESS(f'Created admin user {admin_email}'))
            else:
                if not admin_user.groups.filter(name='admin').exists():
                    admin_user.groups.add(admin_group)

        if worker_email and worker_password:
            worker_user, created = User.objects.get_or_create(
                username=worker_email,
                defaults={'email': worker_email}
            )
            if created:
                worker_user.set_password(worker_password)
                worker_user.save()
                worker_user.groups.add(worker_group)
                self.stdout.write(self.style.SUCCESS(f'Created worker user {worker_email}'))
            else:
                if not worker_user.groups.filter(name='worker').exists():
                    worker_user.groups.add(worker_group)
