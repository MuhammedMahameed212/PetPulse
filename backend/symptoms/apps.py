from django.apps import AppConfig


class SymptomsConfig(AppConfig):
    """Registers the symptoms app with Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "symptoms"
