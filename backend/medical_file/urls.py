from django.urls import path

from .views import MedicalFileView

urlpatterns = [
    path("", MedicalFileView.as_view(), name="medical-file"),
]
