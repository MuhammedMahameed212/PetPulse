from django.contrib import admin

from .models import SymptomAttachment, SymptomLog


class SymptomAttachmentInline(admin.TabularInline):
    """The record's files, listed without their bytes."""

    model = SymptomAttachment
    fields = ("kind", "content_type", "size", "created_at")
    readonly_fields = fields
    extra = 0


@admin.register(SymptomLog)
class SymptomLogAdmin(admin.ModelAdmin):
    """Admin screen for symptom records, searchable by description, pet or owner."""

    list_display = ("description", "pet", "occurred_at", "severity", "status", "created_by")
    list_filter = ("severity", "status")
    search_fields = ("description", "pet__name", "pet__owner__username")
    inlines = [SymptomAttachmentInline]
