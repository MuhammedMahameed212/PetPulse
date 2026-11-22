from rest_framework import permissions

from accounts.models import User


class IsPetOwner(permissions.BasePermission):
    """
    Only pet-owner accounts manage pets;
    vet access arrives with the sharing stories.
    """

    message = "Only pet owner accounts can manage pets."

    def has_permission(self, request, view) -> bool:
        """Lets the request through only for pet-owner accounts."""
        return getattr(request.user, "role", None) == User.Role.PET_OWNER
