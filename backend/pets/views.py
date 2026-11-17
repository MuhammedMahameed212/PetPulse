from rest_framework import exceptions, permissions, viewsets

from .access import accessible_pets
from .permissions import IsPetOwner
from .serializers import MAX_UPLOAD_BYTES, PetSerializer

# Room for the photo plus the text fields and multipart boundaries.
MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024


class PayloadTooLarge(exceptions.APIException):
    """The 413 "too large" error for requests over the upload limit."""

    status_code = 413
    default_detail = "Photo must be 5 MB or smaller."
    default_code = "payload_too_large"


class PetViewSet(viewsets.ModelViewSet):
    """PET-1 (US-1): pet owners create and manage profiles for their own pets."""

    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def initial(self, request, *args, **kwargs):
        """Runs before every request: after the sign-in check, refuses bodies over 6 MB before reading them."""
        super().initial(request, *args, **kwargs)
        # Refuse before request.data is touched; otherwise Django spools the whole upload to disk first.
        if int(request.META.get("CONTENT_LENGTH") or 0) > MAX_REQUEST_BYTES:
            raise PayloadTooLarge()

    def get_queryset(self):
        """The pets this user may see; anyone else's pet answers 404."""
        return accessible_pets(self.request.user)  # other owners' pets → 404

    def perform_create(self, serializer):
        """Saves a new pet with the signed-in user as its owner."""
        serializer.save(owner=self.request.user)
