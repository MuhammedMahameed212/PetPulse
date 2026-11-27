from rest_framework.routers import SimpleRouter

from .views import CareViewSet

router = SimpleRouter()
router.register("", CareViewSet, basename="care")

urlpatterns = router.urls
