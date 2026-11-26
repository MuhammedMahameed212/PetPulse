from django.conf import settings
from django.db import models
from django.utils import timezone

from .recurrence import next_due


class Reminder(models.Model):
    """PET-5 (US-5): a dated reminder for one of a pet's medicines, vaccinations, treatments or vet visits."""

    class Kind(models.TextChoices):
        """What the reminder is about (AC1)."""

        MEDICATION = "MEDICATION", "Medication"
        VACCINATION = "VACCINATION", "Vaccination"
        TREATMENT = "TREATMENT", "Treatment"
        VET_VISIT = "VET_VISIT", "Vet visit"

    class Repeat(models.TextChoices):
        """How often it comes back; marking a repeating reminder done creates the next one."""

        NONE = "NONE", "Does not repeat"
        WEEKLY = "WEEKLY", "Every week"
        MONTHLY = "MONTHLY", "Every month"
        YEARLY = "YEARLY", "Every year"

    pet = models.ForeignKey("pets.Pet", on_delete=models.CASCADE, related_name="reminders")
    kind = models.CharField(max_length=12, choices=Kind.choices)
    title = models.CharField(max_length=100)
    due_at = models.DateTimeField(db_index=True)  # the alert time (AC2, AC3)
    repeat = models.CharField(max_length=8, choices=Repeat.choices, default=Repeat.NONE)
    medication = models.ForeignKey(  # AC6: only for MEDICATION reminders, same pet
        "medications.Medication", on_delete=models.SET_NULL, null=True, blank=True, related_name="reminders"
    )
    notes = models.CharField(max_length=300, blank=True)
    done_at = models.DateTimeField(null=True, blank=True)  # AC7: null = still open
    done_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_at", "id"]  # soonest first (AC5)

    def __str__(self) -> str:
        """How a reminder appears in the admin, e.g. "Rabies booster (Milo (Dog))"."""
        return f"{self.title} ({self.pet})"

    def can_be_marked_done(self) -> bool:
        """Open and its day has come (local time). A future one can't be ticked, so repeated
        clicks can't run through the reminders that each tick creates."""
        return self.done_at is None and timezone.localdate(self.due_at) <= timezone.localdate()

    def mark_done(self, user) -> "Reminder | None":
        """AC7: closes this reminder as done by `user`, and for a repeating one opens the next,
        one step after this one's due time. Returns the next reminder, or None. Call inside a transaction."""
        self.done_at = timezone.now()
        self.done_by = user
        self.save(update_fields=["done_at", "done_by", "updated_at"])
        due = next_due(self.due_at, self.repeat)
        if due is None:
            return None
        return Reminder.objects.create(
            pet=self.pet, kind=self.kind, title=self.title, due_at=due, repeat=self.repeat,
            medication=self.medication, notes=self.notes, created_by=user,
        )
