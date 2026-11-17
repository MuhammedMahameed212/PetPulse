from django.contrib import admin

from .models import Pet


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    """Admin screen for pets, searchable by pet name or owner."""

    list_display = ("name", "species", "breed", "owner", "updated_at")
    list_filter = ("species",)
    search_fields = ("name", "owner__username", "owner__email")
