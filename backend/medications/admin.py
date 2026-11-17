from django.contrib import admin

from .models import DoseLog, Medication


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    """Admin screen for medicines, searchable by medicine, pet or owner."""

    list_display = ("name", "pet", "dosage", "frequency", "start_date", "end_date")
    list_filter = ("frequency",)
    search_fields = ("name", "pet__name", "pet__owner__username")


@admin.register(DoseLog)
class DoseLogAdmin(admin.ModelAdmin):
    """Admin screen for recorded doses: when each was given and by whom."""

    list_display = ("medication", "scheduled_date", "scheduled_time", "given_at", "given_by")
    list_filter = ("scheduled_date",)
