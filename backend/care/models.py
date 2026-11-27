from django.conf import settings
from django.db import models


class CareRecord(models.Model):
    """PET-3 (US-3): one vaccination or periodic treatment, given to a pet once."""

    class Category(models.TextChoices):
        """What kind of care it was."""

        VACCINE = "VACCINE", "Vaccine"
        FLEA_TICK = "FLEA_TICK", "Flea & tick"
        DEWORMING = "DEWORMING", "Deworming"
        OTHER = "OTHER", "Other"

    pet = models.ForeignKey("pets.Pet", on_delete=models.CASCADE, related_name="care_records")
    category = models.CharField(max_length=10, choices=Category.choices)
    name = models.CharField(max_length=100)
    given_on = models.DateField()
    next_due = models.DateField(null=True, blank=True)
    given_by = models.CharField(max_length=100, blank=True)
    notes = models.TextField(max_length=2000, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-given_on", "-id"]  # newest first (AC3)

    def __str__(self) -> str:
        """How a record appears in the admin, e.g. "Rabies (Milo (Dog))"."""
        return f"{self.name} ({self.pet})"
