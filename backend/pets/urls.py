from rest_framework.routers import SimpleRouter

from .views import PetViewSet

router = SimpleRouter()
router.register("", PetViewSet, basename="pet")

urlpatterns = router.urls
