from rest_framework.routers import SimpleRouter

from .views import SymptomViewSet

router = SimpleRouter()
router.register("", SymptomViewSet, basename="symptom")

urlpatterns = router.urls
