from django.apps import AppConfig


class CareConfig(AppConfig):
    """Registers the vaccinations and periodic treatments app with Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "care"
