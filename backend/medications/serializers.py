import re

from django.utils import timezone
from rest_framework import serializers

from .models import DoseLog, Medication

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
MAX_DOSE_TIMES = 6


class DoseSerializer(serializers.ModelSerializer):
    """A dose of today's course; the server sets the date, `given_at` and `given_by`."""

    scheduled_time = serializers.TimeField(format="%H:%M", required=False, allow_null=True)
    given_by = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()

    class Meta:
        model = DoseLog
        fields = ["id", "scheduled_date", "scheduled_time", "given_at", "given_by", "mine"]
        read_only_fields = ["id", "scheduled_date", "given_at"]

    def get_given_by(self, dose: DoseLog) -> str:
        """The name shown for who gave the dose: first name, else username."""
        user = dose.given_by
        return (user.first_name or user.username) if user else "A deleted account"

    def get_mine(self, dose: DoseLog) -> bool:
        """True if the signed-in user gave this dose, so the screen shows Undo."""
        return dose.given_by_id == self.context["request"].user.id

    def validate(self, attrs):
        """Allows a tick only if the medicine is active today and the time fits it:
        one of its dose times for daily medicines, no time for as-needed ones."""
        med = self.context["medication"]
        time = attrs.get("scheduled_time")
        if not med.is_active_on(timezone.localdate()):
            raise serializers.ValidationError("This medicine isn't active today.")
        if med.frequency == Medication.Frequency.AS_NEEDED:
            if time is not None:
                raise serializers.ValidationError({"scheduled_time": "As-needed doses have no set time."})
        elif time is None or time.strftime("%H:%M") not in med.dose_times:
            raise serializers.ValidationError({"scheduled_time": "Pick one of this medicine's dose times."})
        return attrs


class MedicationSerializer(serializers.ModelSerializer):
    """Turns a medicine into JSON (with today's doses) and validates what the form sends."""

    dose_times = serializers.ListField(child=serializers.CharField(), required=False)
    is_active = serializers.SerializerMethodField()
    today = serializers.SerializerMethodField()

    class Meta:
        model = Medication
        fields = [
            "id", "name", "dosage", "frequency", "dose_times", "start_date", "end_date",
            "notes", "is_active", "today", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_active(self, med: Medication) -> bool:
        """Whether the course covers today (shown as "Not active today" when false)."""
        return med.is_active_on(timezone.localdate())

    def get_today(self, med: Medication) -> list[dict]:
        """Today's dose slots, each with its dose or None. Doses at times since removed stay listed."""
        today = timezone.localdate()
        doses = [DoseSerializer(d, context=self.context).data for d in med.doses.all() if d.scheduled_date == today]
        if med.frequency == Medication.Frequency.AS_NEEDED:
            return [{"time": None, "dose": d} for d in doses]
        given = {d["scheduled_time"]: d for d in doses if d["scheduled_time"]}  # skip untimed doses logged as-needed
        times = set(given) | (set(med.dose_times) if med.is_active_on(today) else set())
        return [{"time": t, "dose": given.get(t)} for t in sorted(times)]

    def validate(self, attrs):
        """Checks the schedule (as-needed has no times; daily has 1–6 valid, different times)
        and that the end date isn't before the start date."""
        if self.value_after_save(attrs, "frequency") == Medication.Frequency.AS_NEEDED:
            if attrs.get("dose_times"):
                raise serializers.ValidationError({"dose_times": "As-needed medicines have no dose times."})
            attrs["dose_times"] = []
        else:
            attrs["dose_times"] = self.clean_dose_times(self.value_after_save(attrs, "dose_times") or [])

        start, end = self.value_after_save(attrs, "start_date"), self.value_after_save(attrs, "end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date can't be before the start date."})
        return attrs

    def value_after_save(self, attrs, field):
        """PATCH sends only some fields; validate the medicine as it will be saved."""
        return attrs.get(field, getattr(self.instance, field, None))

    @staticmethod
    def clean_dose_times(times: list[str]) -> list[str]:
        """Checks the daily dose times (1–6, format HH:MM, no duplicates) and returns them sorted."""
        if not 1 <= len(times) <= MAX_DOSE_TIMES:
            raise serializers.ValidationError({"dose_times": f"Add between 1 and {MAX_DOSE_TIMES} dose times."})
        if any(not TIME_RE.match(t) for t in times):
            raise serializers.ValidationError({"dose_times": "Use times like 08:00 or 20:30."})
        if len(set(times)) != len(times):
            raise serializers.ValidationError({"dose_times": "Each dose time must be different."})
        return sorted(times)
