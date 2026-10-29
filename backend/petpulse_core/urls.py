from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def health_check(request):
    """Simple endpoint to verify Django backend is running and reachable from React."""
    return JsonResponse(
        {
            "status": "ok",
            "project": "PetPulse",
            "message": "Django backend is running and connected!",
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="api-health"),
]
