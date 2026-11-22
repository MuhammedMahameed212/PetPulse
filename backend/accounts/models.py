'''
import abstractuser, Django's built-in user. it already has username,password(hashed).
models is the toolbox of columntypes (Charfield, EmailField,...).
'''
from django.contrib.auth.models import AbstractUser
from django.db import models



class User(AbstractUser):
    """
    Inherit from AbstractUser, settings.py tells Django to use this class instead of the default 
    Distinguishes between Pet Owners and Veterinarians / Clinic Staff.

    """

    class Role(models.TextChoices):
        """
        The two kinds of account: pet owner or veterinarian / clinic staff.
        each option has 2 values: first is what goes into the database, the latter is what the user see in the web page.
        """

        PET_OWNER = "PET_OWNER", "Pet Owner (בעל חיית מחמד)"
        VETERINARIAN = "VETERINARIAN", "Veterinarian / Clinic Staff (וטרינר / צוות מרפאה)"

    #OVerrides Django's built-in email field, check if the value looks like an email and its unique.
    email = models.EmailField(unique=True)

    #role, defualt is PetOwner.
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PET_OWNER,
    )
    '''
    override models CHarField for each field, user may leave them blank.
    '''
    phone_number = models.CharField(max_length=30, blank=True)

    # Veterinarian / Clinic Staff fields
    license_number = models.CharField(max_length=64, blank=True)
    clinic_name = models.CharField(max_length=150, blank=True)

    def __str__(self) -> str:
        """How a user appears in the admin and logs: the username and role, e.g. "noa (Pet Owner (בעל חיית מחמד))"."""
        role_label = self.Role(self.role).label if self.role in self.Role.values else self.role
        return f"{self.username} ({role_label})"
