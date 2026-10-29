import django
from django.contrib import admin
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder
from django.http import JsonResponse
from django.urls import include, path
from django.utils import timezone


def health_check(request):
    """Simple endpoint to verify Django backend is running and reachable from React."""
    return JsonResponse(
        {
            "status": "ok",
            "project": "PetPulse",
            "message": "Django backend is running and connected!",
        }
    )


def system_metrics(request):
    """
    Returns live application & database health metrics for monitoring and CI verification.
    """
    db_connected = False
    applied_migrations = 0
    try:
        connection.ensure_connection()
        db_connected = True
        applied_migrations = MigrationRecorder.Migration.objects.count()
    except Exception:
        db_connected = False

    return JsonResponse(
        {
            "status": "healthy" if db_connected else "degraded",
            "timestamp": timezone.now().isoformat(),
            "django_version": django.get_version(),
            "database": {
                "connected": db_connected,
                "vendor": connection.vendor,
                "applied_migrations": applied_migrations,
            },
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="api-health"),
    path("api/metrics/", system_metrics, name="api-metrics"),
    path("api/auth/", include("accounts.urls")),
]
