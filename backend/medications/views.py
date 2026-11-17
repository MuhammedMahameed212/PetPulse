from django.db import IntegrityError, transaction
from django.db.models import Case, IntegerField, Prefetch, Q, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from pets.access import accessible_pets
from pets.permissions import IsPetOwner

from .models import DoseLog
from .serializers import DoseSerializer, MedicationSerializer


class MedicationViewSet(viewsets.ModelViewSet):
    """PET-4 (US-4): an owner manages the medicines of one of their pets (/api/pets/<pet_id>/medications/)."""

    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_pet(self):
        """Loads the pet from the URL once per request; a pet the user can't access answers 404."""
        if not hasattr(self, "_pet"):
            # A pet the caller can't access answers 404, as in the pets API.
            self._pet = get_object_or_404(accessible_pets(self.request.user), pk=self.kwargs["pet_id"])
        return self._pet

    def get_queryset(self):
        """The pet's medicines: active ones first, then by name, with today's doses loaded in one extra query."""
        today = timezone.localdate()
        todays_doses = DoseLog.objects.filter(scheduled_date=today).select_related("given_by")
        return (
            self.get_pet().medications
            .annotate(ended=Case(When(Q(end_date__lt=today), then=1), default=0, output_field=IntegerField()))
            .prefetch_related(Prefetch("doses", queryset=todays_doses))
            .order_by("ended", "name", "id")
        )

    def perform_create(self, serializer):
        """Saves a new medicine to the pet from the URL, recording who added it."""
        serializer.save(pet=self.get_pet(), created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="doses")
    def mark_dose(self, request, pet_id=None, pk=None):
        """AC4, AC5: mark one of today's doses as given."""
        med = self.get_object()
        serializer = DoseSerializer(data=request.data, context={"request": request, "medication": med})
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                serializer.save(medication=med, scheduled_date=timezone.localdate(), given_by=request.user)
        except IntegrityError:  # someone ticked the same dose first
            raise exceptions.ValidationError({"scheduled_time": "This dose is already marked as given."})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"doses/(?P<dose_id>\d+)")
    def undo_dose(self, request, pet_id=None, pk=None, dose_id=None):
        """Undo your own mark from today, e.g. after a mis-click."""
        dose = get_object_or_404(DoseLog, pk=dose_id, medication=self.get_object())
        if dose.given_by_id != request.user.id:
            raise exceptions.PermissionDenied("Only the person who marked this dose can undo it.")
        if dose.scheduled_date != timezone.localdate():
            raise exceptions.ValidationError("Only today's doses can be undone.")
        dose.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
