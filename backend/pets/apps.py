from django.apps import AppConfig


class PetsConfig(AppConfig):
    """Registers the pets app with Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "pets"
