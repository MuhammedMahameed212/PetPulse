from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model for US-15 (רישום והתחברות למערכת).
    Distinguishes between Pet Owners and Veterinarians / Clinic Staff.
    """

    class Role(models.TextChoices):
        PET_OWNER = "PET_OWNER", "Pet Owner (בעל חיית מחמד)"
        VETERINARIAN = "VETERINARIAN", "Veterinarian / Clinic Staff (וטרינר / צוות מרפאה)"

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PET_OWNER,
    )
    phone_number = models.CharField(max_length=30, blank=True)

    # Veterinarian / Clinic Staff fields
    license_number = models.CharField(max_length=64, blank=True)
    clinic_name = models.CharField(max_length=150, blank=True)

    def __str__(self) -> str:
        return f"{self.username} ({self.get_role_display()})"
