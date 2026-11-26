from django.utils import timezone
from rest_framework import serializers

from medications.models import Medication

from .models import Reminder


class ReminderSerializer(serializers.ModelSerializer):
    """Turns a reminder into JSON and validates what the form sends.
    The server sets the pet, who created it and whether it's done."""

    pet_name = serializers.CharField(source="pet.name", read_only=True)
    medication = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.none(), required=False, allow_null=True  # narrowed to the pet in __init__
    )
    medication_name = serializers.CharField(source="medication.name", read_only=True, default=None)
    is_due = serializers.SerializerMethodField()
    can_mark_done = serializers.BooleanField(source="can_be_marked_done", read_only=True)
    done_by = serializers.SerializerMethodField()

    class Meta:
        model = Reminder
        fields = [
            "id", "pet", "pet_name", "kind", "title", "due_at", "repeat", "medication", "medication_name",
            "notes", "is_due", "can_mark_done", "done_at", "done_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "pet", "done_at", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        """AC6: only the medicines of the pet in the URL can be linked. Another pet's medicine
        answers "does not exist", like a made-up id, so it never shows that the medicine is there."""
        super().__init__(*args, **kwargs)
        pet = self.context.get("pet")
        if pet is not None:
            self.fields["medication"].queryset = pet.medications.all()

    def validate(self, attrs):
        """A done reminder is history: it can be deleted, not changed.
        Only a Medication reminder can link a medicine (AC6)."""
        if self.instance is not None and self.instance.done_at is not None:
            raise serializers.ValidationError("A done reminder can't be edited.")
        kind = attrs.get("kind", getattr(self.instance, "kind", None))
        medication = attrs.get("medication", getattr(self.instance, "medication", None))
        if medication is not None and kind != Reminder.Kind.MEDICATION:
            raise serializers.ValidationError({"medication": "Only a medication reminder can link a medicine."})
        return attrs

    def get_is_due(self, reminder: Reminder) -> bool:
        """True when it's still open and its time has come (shown as "Overdue")."""
        return reminder.done_at is None and reminder.due_at <= timezone.now()

    def get_done_by(self, reminder: Reminder) -> str | None:
        """Who marked it done: first name, else username; None while it's open."""
        if reminder.done_at is None:
            return None
        user = reminder.done_by
        return (user.first_name or user.username) if user else "A deleted account"
