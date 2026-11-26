from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from pets.access import accessible_pets
from pets.permissions import IsPetOwner

from .models import Reminder
from .serializers import ReminderSerializer


class ReminderViewSet(viewsets.ModelViewSet):
    """PET-5 (US-5): an owner manages the reminders of one of their pets (/api/pets/<pet_id>/reminders/)."""

    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_pet(self):
        """Loads the pet from the URL once per request; a pet the user can't access answers 404."""
        if not hasattr(self, "_pet"):
            self._pet = get_object_or_404(accessible_pets(self.request.user), pk=self.kwargs["pet_id"])
        return self._pet

    def get_queryset(self):
        """The pet's reminders. The list shows open ones soonest first (AC5),
        or with `?status=done` the done ones, latest first; by id, any of them."""
        reminders = self.get_pet().reminders.select_related("pet", "done_by", "medication")
        if self.action != "list":
            return reminders
        if self.request.query_params.get("status") == "done":
            return reminders.filter(done_at__isnull=False).order_by("-done_at", "-id")
        return reminders.filter(done_at__isnull=True)

    def get_serializer_context(self):
        """Hands the pet to the serializer, so only its medicines can be linked (AC6)."""
        return {**super().get_serializer_context(), "pet": self.get_pet()}

    def perform_create(self, serializer):
        """Saves a new reminder to the pet from the URL, recording who added it."""
        serializer.save(pet=self.get_pet(), created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="done")
    def mark_done(self, request, pet_id=None, pk=None):
        """AC7: mark the reminder done; a repeating one comes back as a new reminder."""
        with transaction.atomic():
            # Row lock: two clicks at once can't both pass the check and create two next reminders.
            # of=("self",): lock only the reminder; Postgres can't lock the nullable done_by join.
            reminder = get_object_or_404(self.get_queryset().select_for_update(of=("self",)), pk=pk)
            if reminder.done_at is not None:
                raise exceptions.ValidationError("This reminder is already done.")
            if not reminder.can_be_marked_done():
                raise exceptions.ValidationError("This reminder isn't due yet. It can be marked done from its day.")
            nxt = reminder.mark_done(request.user)
        context = self.get_serializer_context()
        return Response({
            "done": ReminderSerializer(reminder, context=context).data,
            "next": ReminderSerializer(nxt, context=context).data if nxt else None,
        })


class AllRemindersView(generics.ListAPIView):
    """PET-5 (AC5, AC3): open reminders across all the caller's pets, soonest first (/api/reminders/).
    `?due=1` keeps only those whose time has come; the bell polls it. Read-only."""

    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]

    def get_queryset(self):
        """Open reminders of the pets the caller can access."""
        reminders = Reminder.objects.filter(
            pet__in=accessible_pets(self.request.user), done_at__isnull=True
        ).select_related("pet", "medication")
        if self.request.query_params.get("due") == "1":
            reminders = reminders.filter(due_at__lte=timezone.now())
        return reminders
