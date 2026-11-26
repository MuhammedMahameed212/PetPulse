from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import SymptomAttachment, SymptomLog

CLOCK_SLACK = timedelta(minutes=1)  # the phone's clock may run a little ahead of the server's


class AttachmentSerializer(serializers.ModelSerializer):
    """A file's details for the history (never its bytes; those come from the download endpoint)."""

    class Meta:
        model = SymptomAttachment
        fields = ["id", "kind", "content_type", "size"]


class SymptomSerializer(serializers.ModelSerializer):
    """Turns a symptom record into JSON and validates what the add/edit form sends."""

    attachments = AttachmentSerializer(many=True, read_only=True)
    created_by = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()

    class Meta:
        model = SymptomLog
        fields = [
            "id", "occurred_at", "description", "notes", "severity", "status",
            "created_by", "mine", "attachments", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_created_by(self, log: SymptomLog) -> str:
        """The name shown for who wrote the record: first name, else username."""
        user = log.created_by
        return (user.first_name or user.username) if user else "A deleted account"

    def get_mine(self, log: SymptomLog) -> bool:
        """True if the signed-in user wrote this record, so the screen shows Edit and Delete."""
        return log.created_by_id == self.context["request"].user.id

    def validate_description(self, value: str) -> str:
        """Refuses a description that is only spaces."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Describe the symptom or change.")
        return value

    def validate_notes(self, value: str) -> str:
        """Trims the notes."""
        return value.strip()

    def validate_occurred_at(self, value):
        """Refuses a time in the future (a minute of slack for clocks that differ)."""
        if value > timezone.now() + CLOCK_SLACK:
            raise serializers.ValidationError("The date and time can't be in the future.")
        return value
