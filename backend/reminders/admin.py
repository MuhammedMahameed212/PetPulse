from django.contrib import admin

from .models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    """Admin screen for reminders, searchable by title, pet or owner."""

    list_display = ("title", "pet", "kind", "due_at", "repeat", "done_at")
    list_filter = ("kind", "repeat")
    search_fields = ("title", "pet__name", "pet__owner__username")
