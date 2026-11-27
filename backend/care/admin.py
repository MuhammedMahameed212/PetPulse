from django.contrib import admin

from .models import CareRecord


@admin.register(CareRecord)
class CareRecordAdmin(admin.ModelAdmin):
    """Admin screen for vaccinations and treatments, searchable by name, pet or owner."""

    list_display = ("name", "category", "pet", "given_on", "next_due", "created_by")
    list_filter = ("category",)
    search_fields = ("name", "pet__name", "pet__owner__username")
