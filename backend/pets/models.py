from django.conf import settings
from django.db import models


class Pet(models.Model):
    """PET-1 (US-1): a pet profile owned by one pet-owner account."""

    class Species(models.TextChoices):
        DOG = "DOG", "Dog"
        CAT = "CAT", "Cat"
        BIRD = "BIRD", "Bird"
        RABBIT = "RABBIT", "Rabbit"
        OTHER = "OTHER", "Other"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pets")
    name = models.CharField(max_length=60)
    species = models.CharField(max_length=10, choices=Species.choices)
    breed = models.CharField(max_length=80, blank=True)
    birth_date = models.DateField()
    birth_date_is_estimate = models.BooleanField(default=False)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)
    photo = models.BinaryField(null=True, blank=True, editable=False)  # JPEG bytes, ≤512 px
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_species_display()})"
