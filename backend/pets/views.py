from rest_framework import exceptions, permissions, viewsets

from .access import accessible_pets
from .permissions import IsPetOwner
from .serializers import MAX_UPLOAD_BYTES, PetSerializer

# Room for the photo (5MB) plus the text fields and multipart boundaries.
MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024 #total is 6MB.


class PayloadTooLarge(exceptions.APIException):
    """The 413 "too large" error for requests over the upload limit."""

    status_code = 413
    default_detail = "Photo must be 5 MB or smaller."
    default_code = "payload_too_large"


#ModelViewSet is like ModelSerializer but for views: contains 'list','create','retrieve','update'...
class PetViewSet(viewsets.ModelViewSet):
    """PET-1 (US-1): pet owners create and manage profiles for their own pets."""

    #which serializer to use.
    serializer_class = PetSerializer

    #checks that ALL must pass, in order.
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def initial(self, request, *args, **kwargs):
        """
        Runs before every request: after the sign-in check,
        refuses bodies over 6 MB before reading them.
        """
        #runs DRF normal version first. authentication and permission checks happen here.
        super().initial(request, *args, **kwargs)

        # Refuse before request.data is touched; otherwise Django spools the whole upload to disk first.
        # checking before sending to serializer so it doesn't exceed max size.
        if int(request.META.get("CONTENT_LENGTH") or 0) > MAX_REQUEST_BYTES:
            raise PayloadTooLarge()

    def get_queryset(self):
        """
        The pets this user may see; anyone else's pet answers 404.
        not 403 because that tells the attacker that a pet with this id exists its just not yours.
        """
        return accessible_pets(self.request.user)  # other owners' pets → 404

    
    def perform_create(self, serializer):
        """Saves a new pet with the signed-in user as its owner."""
        serializer.save(owner=self.request.user)
