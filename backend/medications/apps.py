from django.apps import AppConfig


class MedicationsConfig(AppConfig):
    """Registers the medications app with Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "medications"
