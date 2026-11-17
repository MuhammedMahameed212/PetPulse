from rest_framework.routers import SimpleRouter

from .views import MedicationViewSet

router = SimpleRouter()
router.register("", MedicationViewSet, basename="medication")

urlpatterns = router.urls
