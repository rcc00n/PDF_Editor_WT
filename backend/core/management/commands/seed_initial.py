from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group

from relayforms.env import env_str


class Command(BaseCommand):
    help = 'Seed initial admin/worker users and role groups.'

    def handle(self, *args, **options):
        # Ensure role groups exist before assigning users.
        admin_group, _ = Group.objects.get_or_create(name='admin')
        worker_group, _ = Group.objects.get_or_create(name='worker')

        def seed_user(email, password, group, *, make_staff=False):
            if not email or not password:
                return
            user, created = User.objects.get_or_create(
                username=email,
                defaults={'email': email},
            )
            if created:
                user.set_password(password)
                if make_staff:
                    user.is_staff = True
                user.save()
                user.groups.add(group)
                self.stdout.write(self.style.SUCCESS(f'Created {group.name} user {email}'))
                return
            if not user.groups.filter(name=group.name).exists():
                user.groups.add(group)

        # Seed users only when credentials are provided.
        seed_user(
            env_str('ADMIN_EMAIL'),
            env_str('ADMIN_PASSWORD'),
            admin_group,
            make_staff=True,
        )
        seed_user(
            env_str('WORKER_EMAIL'),
            env_str('WORKER_PASSWORD'),
            worker_group,
        )
