from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from pets.access import accessible_pets
from pets.permissions import IsPetOwner

from .timeline import build_timeline


class MedicalFileView(APIView):
    """PET-2 (US-2): GET /api/pets/<pet_id>/medical-file/ — the pet's medical timeline, newest first (read-only)."""

    permission_classes = [permissions.IsAuthenticated, IsPetOwner]

    def get(self, request, pet_id: int):
        """A pet the user can't access answers 404."""
        pet = get_object_or_404(accessible_pets(request.user), pk=pet_id)
        return Response(build_timeline(pet))
