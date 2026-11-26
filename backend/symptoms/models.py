from django.conf import settings
from django.db import models


class SymptomLog(models.Model):
    """PET-6 (US-6): one symptom or change in a pet's health, noticed at a given time."""

    class Severity(models.TextChoices):
        """How bad the symptom is, as the owner judges it."""

        MILD = "MILD", "Mild"
        MODERATE = "MODERATE", "Moderate"
        SEVERE = "SEVERE", "Severe"

    class Status(models.TextChoices):
        """Whether the symptom is still going on."""

        ONGOING = "ONGOING", "Ongoing"
        RESOLVED = "RESOLVED", "Resolved"

    pet = models.ForeignKey("pets.Pet", on_delete=models.CASCADE, related_name="symptoms")
    occurred_at = models.DateTimeField()
    description = models.CharField(max_length=200)
    notes = models.TextField(max_length=2000, blank=True)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MILD)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ONGOING)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-occurred_at", "-id"]  # newest first (AC4)

    def __str__(self) -> str:
        """How a record appears in the admin, e.g. "Limping (Milo (Dog))"."""
        return f"{self.description} ({self.pet})"


class SymptomAttachment(models.Model):
    """PET-6 (AC3): one photo or video attached to a symptom record, stored in the database."""

    class Kind(models.TextChoices):
        """Photo or video, decided by the server from the file's content."""

        IMAGE = "IMAGE", "Photo"
        VIDEO = "VIDEO", "Video"

    symptom = models.ForeignKey(SymptomLog, on_delete=models.CASCADE, related_name="attachments")
    kind = models.CharField(max_length=5, choices=Kind.choices)
    content_type = models.CharField(max_length=40)
    data = models.BinaryField()
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]  # in the order they were added

    def __str__(self) -> str:
        """How a file appears in the admin, e.g. "Photo for Limping (Milo (Dog))"."""
        return f"{self.get_kind_display()} for {self.symptom}"
