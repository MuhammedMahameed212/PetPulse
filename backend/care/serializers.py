from django.utils import timezone
from rest_framework import serializers

from .models import CareRecord
from .status import due_status


class CareSerializer(serializers.ModelSerializer):
    """Turns a vaccination or treatment into JSON and validates what the add/edit form sends.

    The view puts `today` and `replaced_ids` in the context, worked out once per request.
    """

    due_status = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()

    class Meta:
        model = CareRecord
        fields = [
            "id", "category", "name", "given_on", "next_due", "given_by", "notes",
            "due_status", "created_by", "mine", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_due_status(self, record: CareRecord) -> str | None:
        """OVERDUE, DUE_SOON or UP_TO_DATE for the latest dose with a next date, else None."""
        replaced = record.id in self.context["replaced_ids"]
        return due_status(record.next_due, replaced, self.context["today"])

    def get_created_by(self, record: CareRecord) -> str:
        """The name shown for who wrote the record: first name, else username."""
        user = record.created_by
        return (user.first_name or user.username) if user else "A deleted account"

    def get_mine(self, record: CareRecord) -> bool:
        """True if the signed-in user wrote this record, so the screen shows Edit and Delete."""
        return record.created_by_id == self.context["request"].user.id

    def validate_name(self, value: str) -> str:
        """Refuses a name that is only spaces."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter the vaccine or treatment name.")
        return value

    def validate_given_by(self, value: str) -> str:
        """Trims the clinic or vet name."""
        return value.strip()

    def validate_notes(self, value: str) -> str:
        """Trims the notes."""
        return value.strip()

    def validate_given_on(self, value):
        """Refuses a date in the future."""
        if value > timezone.localdate():
            raise serializers.ValidationError("The date given can't be in the future.")
        return value

    def validate(self, attrs):
        """The next due date must come after the date given, also when an edit changes only one of them."""
        given_on = attrs.get("given_on", getattr(self.instance, "given_on", None))
        next_due = attrs.get("next_due", getattr(self.instance, "next_due", None))
        if given_on and next_due and next_due <= given_on:
            raise serializers.ValidationError({"next_due": "The next due date must be after the date given."})
        return attrs
