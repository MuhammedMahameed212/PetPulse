from django.apps import AppConfig


class RemindersConfig(AppConfig):
    """Registers the reminders app with Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "reminders"
