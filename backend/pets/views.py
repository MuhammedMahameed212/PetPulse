from rest_framework import permissions, viewsets

from .models import Pet
from .permissions import IsPetOwner
from .serializers import PetSerializer


class PetViewSet(viewsets.ModelViewSet):
    """PET-1 (US-1): pet owners create and manage profiles for their own pets."""

    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Pet.objects.filter(owner=self.request.user)  # other owners' pets → 404

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
