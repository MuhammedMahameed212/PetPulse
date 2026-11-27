from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, permissions, viewsets

from pets.access import accessible_pets
from pets.permissions import IsPetOwner

from .models import CareRecord
from .serializers import CareSerializer
from .status import replaced_ids


class CareViewSet(viewsets.ModelViewSet):
    """PET-3 (US-3): a pet's vaccinations and periodic treatments (/api/pets/<pet_id>/care/)."""

    serializer_class = CareSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_pet(self):
        """Loads the pet from the URL once per request; a pet the user can't access answers 404."""
        if not hasattr(self, "_pet"):
            self._pet = get_object_or_404(accessible_pets(self.request.user), pk=self.kwargs["pet_id"])
        return self._pet

    def get_queryset(self):
        """The pet's records, newest first; `?category=VACCINE|FLEA_TICK|DEWORMING|OTHER` filters (AC3)."""
        records = self.get_pet().care_records.select_related("created_by")
        category = self.request.query_params.get("category")
        if category in CareRecord.Category.values:
            records = records.filter(category=category)
        return records

    def get_serializer_context(self):
        """Adds today's date and which records a later dose replaced (over all the pet's records, not the filtered list)."""
        context = super().get_serializer_context()
        context["today"] = timezone.localdate()
        context["replaced_ids"] = self.current_replaced_ids()
        return context

    def current_replaced_ids(self) -> set[int]:
        """One light query of the pet's doses, read fresh (a save can change which dose is the latest)."""
        doses = self.get_pet().care_records.values_list("id", "category", "name", "given_on")
        return replaced_ids(list(doses))

    def perform_create(self, serializer):
        """Saves a new record to the pet from the URL, recording who wrote it."""
        serializer.save(pet=self.get_pet(), created_by=self.request.user)
        serializer.context["replaced_ids"] = self.current_replaced_ids()

    def perform_update(self, serializer):
        """AC4: only the author edits a record."""
        self.check_author(serializer.instance)
        serializer.save()
        serializer.context["replaced_ids"] = self.current_replaced_ids()

    def perform_destroy(self, instance):
        """AC4: only the author deletes a record."""
        self.check_author(instance)
        instance.delete()

    def check_author(self, record: CareRecord):
        """Refuses changes from anyone but the user who wrote the record."""
        if record.created_by_id != self.request.user.id:
            raise exceptions.PermissionDenied("Only the person who wrote this record can change it.")
