"""PET-5 (US-4 AC3): which of today's medicine doses are due, for the reminder bell.

Read live from the PET-4 schedule (dose_times + DoseLog), so nothing is copied and nothing goes stale."""

from datetime import datetime

from django.db.models import Q
from django.utils import timezone

from pets.access import accessible_pets

from .models import DoseLog, Medication


def due_doses(user, now: datetime | None = None) -> list[dict]:
    """Today's daily doses across the user's pets whose time has come (<= now, local time)
    and that nobody has marked as given, soonest first. Two queries, whatever the number of pets."""
    local = timezone.localtime(now)
    today, clock = local.date(), local.strftime("%H:%M")

    medicines = (
        Medication.objects.filter(pet__in=accessible_pets(user), frequency=Medication.Frequency.DAILY, start_date__lte=today)
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=today))
        .select_related("pet")
    )
    given = {
        (med_id, slot.strftime("%H:%M"))
        for med_id, slot in DoseLog.objects.filter(
            medication__in=medicines, scheduled_date=today, scheduled_time__isnull=False
        ).values_list("medication_id", "scheduled_time")
    }

    doses = [
        {
            "medication": med.id, "pet": med.pet_id, "pet_name": med.pet.name,
            "name": med.name, "dosage": med.dosage, "date": today.isoformat(), "time": slot,
        }
        for med in medicines
        for slot in med.dose_times  # "HH:MM" strings, so text order is time order
        if slot <= clock and (med.id, slot) not in given
    ]
    return sorted(doses, key=lambda d: (d["time"], d["pet_name"], d["name"]))
