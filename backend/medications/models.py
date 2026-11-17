from datetime import date

from django.conf import settings
from django.db import models


class Medication(models.Model):
    """PET-4 (US-4): a medicine in a pet's medical file, given daily at set times or as needed."""

    class Frequency(models.TextChoices):
        DAILY = "DAILY", "Daily at set times"
        AS_NEEDED = "AS_NEEDED", "As needed"

    pet = models.ForeignKey("pets.Pet", on_delete=models.CASCADE, related_name="medications")
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=60)
    frequency = models.CharField(max_length=10, choices=Frequency.choices)
    dose_times = models.JSONField(default=list, blank=True)  # sorted "HH:MM" strings; empty for AS_NEEDED
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # empty = ongoing
    notes = models.CharField(max_length=300, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return f"{self.name} ({self.pet})"

    def is_active_on(self, day: date) -> bool:
        return self.start_date <= day and (self.end_date is None or day <= self.end_date)


class DoseLog(models.Model):
    """PET-4 (AC4, AC5): one dose given, with when it was marked and by whom."""

    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name="doses")
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField(null=True, blank=True)  # null for as-needed doses
    given_at = models.DateTimeField(auto_now_add=True)
    given_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")

    class Meta:
        ordering = ["given_at", "id"]
        constraints = [
            # Stops a daily dose being ticked twice, even by two requests at once.
            # As-needed doses have no time, and NULLs never clash in a unique constraint.
            models.UniqueConstraint(
                fields=["medication", "scheduled_date", "scheduled_time"], name="one_dose_per_daily_slot"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.medication.name} on {self.scheduled_date} {self.scheduled_time or ''}".strip()
