from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Registers the accounts app (users, sign-in, passwords) with Django."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

