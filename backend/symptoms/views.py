from django.db.models import Prefetch
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from pets.access import accessible_pets
from pets.permissions import IsPetOwner
from pets.views import PayloadTooLarge

from .media import MAX_VIDEO_BYTES, read_attachment
from .models import SymptomAttachment, SymptomLog
from .serializers import AttachmentSerializer, SymptomSerializer

MAX_FILES = 3
MAX_VIDEOS = 1
MAX_REQUEST_BYTES = MAX_VIDEO_BYTES + 1024 * 1024  # the largest file plus the multipart wrapping


class SymptomViewSet(viewsets.ModelViewSet):
    """PET-6 (US-6): the symptom history of one pet (/api/pets/<pet_id>/symptoms/)."""

    serializer_class = SymptomSerializer
    permission_classes = [permissions.IsAuthenticated, IsPetOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def initial(self, request, *args, **kwargs):
        """After the sign-in check, refuses bodies over 11 MB before reading them (as PetViewSet does)."""
        super().initial(request, *args, **kwargs)
        if int(request.META.get("CONTENT_LENGTH") or 0) > MAX_REQUEST_BYTES:
            raise PayloadTooLarge("Files must be 10 MB or smaller.")

    def get_pet(self):
        """Loads the pet from the URL once per request; a pet the user can't access answers 404."""
        if not hasattr(self, "_pet"):
            self._pet = get_object_or_404(accessible_pets(self.request.user), pk=self.kwargs["pet_id"])
        return self._pet

    def get_queryset(self):
        """The pet's records, newest first; `?status=ONGOING|RESOLVED` filters (AC4)."""
        files = SymptomAttachment.objects.defer("data")  # the list never loads the bytes
        records = self.get_pet().symptoms.select_related("created_by").prefetch_related(
            Prefetch("attachments", queryset=files)
        )
        wanted = self.request.query_params.get("status")
        if wanted in SymptomLog.Status.values:
            records = records.filter(status=wanted)
        return records

    def perform_create(self, serializer):
        """Saves a new record to the pet from the URL, recording who wrote it."""
        serializer.save(pet=self.get_pet(), created_by=self.request.user)

    def perform_update(self, serializer):
        """AC5: only the author edits a record."""
        self.check_author(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        """AC5: only the author deletes a record."""
        self.check_author(instance)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="attachments")
    def add_attachment(self, request, pet_id=None, pk=None):
        """AC3: the author attaches one photo or video (multipart field `file`); at most 3, one of them a video."""
        record = self.get_object()
        self.check_author(record)
        kinds = list(record.attachments.values_list("kind", flat=True))
        if len(kinds) >= MAX_FILES:
            raise serializers.ValidationError({"file": f"A record can have at most {MAX_FILES} files."})
        kind, content_type, data = read_attachment(request.data.get("file"))
        if kind == SymptomAttachment.Kind.VIDEO and kinds.count(kind) >= MAX_VIDEOS:
            raise serializers.ValidationError({"file": "A record can have only one video."})
        attachment = SymptomAttachment.objects.create(
            symptom=record, kind=kind, content_type=content_type, data=data, size=len(data)
        )
        return Response(AttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "delete"], url_path=r"attachments/(?P<attachment_id>\d+)")
    def attachment(self, request, pet_id=None, pk=None, attachment_id=None):
        """GET: the file's bytes with its stored content type. DELETE: the author removes the file."""
        record = self.get_object()
        attachment = get_object_or_404(record.attachments, pk=attachment_id)
        if request.method == "DELETE":
            self.check_author(record)
            attachment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        response = HttpResponse(bytes(attachment.data), content_type=attachment.content_type)
        response["X-Content-Type-Options"] = "nosniff"  # never let the browser guess a different type
        response["Cache-Control"] = "private, max-age=3600"
        return response

    def check_author(self, record: SymptomLog):
        """Refuses changes from anyone but the user who wrote the record."""
        if record.created_by_id != self.request.user.id:
            raise exceptions.PermissionDenied("Only the person who wrote this record can change it.")
