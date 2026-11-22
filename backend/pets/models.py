'''
settings give access to project settings, it's needed for Auth_USER_MODEL.
'''
from django.conf import settings
from django.db import models


class Pet(models.Model):
    """PET-1 (US-1): a pet profile owned by one pet-owner account."""

    class Species(models.TextChoices):
        """
        The species an owner can pick; 
        anything else is "Other" plus a free-text breed.
        """

        DOG = "DOG", "Dog"
        CAT = "CAT", "Cat"
        BIRD = "BIRD", "Bird"
        RABBIT = "RABBIT", "Rabbit"
        OTHER = "OTHER", "Other"

    #every pet is assigned to its user via Foregin Key, if user is deleted, all their pets are deleted.
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pets")

    #Pet name and species, can be left blank.
    name = models.CharField(max_length=60)
    species = models.CharField(max_length=10, choices=Species.choices)
    
    breed = models.CharField(max_length=80, blank=True)

    #birth date, save the date and calculate age at frontend/src/petAge.js
    birth_date = models.DateField()
    birth_date_is_estimate = models.BooleanField(default=False)

    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)

    #store photo in database, can be empty.
    photo = models.BinaryField(null=True, blank=True, editable=False)  # JPEG bytes, ≤512 px
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    #holds settings about the table, when listing pets, sort by name, if same name, sort by id.
    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        """How a pet appears in the admin, e.g. "Milo (Dog)"."""
        return f"{self.name} ({self.get_species_display()})"
