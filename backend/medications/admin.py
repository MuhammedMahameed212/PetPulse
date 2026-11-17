from django.contrib import admin

from .models import DoseLog, Medication


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "pet", "dosage", "frequency", "start_date", "end_date")
    list_filter = ("frequency",)
    search_fields = ("name", "pet__name", "pet__owner__username")


@admin.register(DoseLog)
class DoseLogAdmin(admin.ModelAdmin):
    list_display = ("medication", "scheduled_date", "scheduled_time", "given_at", "given_by")
    list_filter = ("scheduled_date",)
