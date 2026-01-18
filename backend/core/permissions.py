from rest_framework.permissions import BasePermission


def is_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    # Staff, superusers, or users in the "admin" group are admins.
    if user.is_superuser or user.is_staff:
        return True
    return user.groups.filter(name='admin').exists()


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)
