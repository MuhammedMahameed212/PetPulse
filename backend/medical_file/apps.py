from django.apps import AppConfig


class MedicalFileConfig(AppConfig):
    """Registers the medical file app (a read-only timeline over the other apps' records)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "medical_file"
