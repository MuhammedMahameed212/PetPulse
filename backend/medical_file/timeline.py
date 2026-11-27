"""PET-2 (US-2): a pet's medical file as one timeline, built from the records other apps own.

Each source has its own small function; vet visits and documents will each add one.
"""

from datetime import date

from django.utils import timezone

from care.models import CareRecord
from medications.models import Medication
from pets.models import Pet


def event(source: str, record_id: int, type_: str, what: str, day: date, title: str, detail: str, time: str | None = None) -> dict:
    """One row of the timeline; `source` is the pet-page section the record lives in.

    The id names the event too, since a medicine has two (STARTED and ENDED).
    """
    return {
        "id": f"{source}-{record_id}-{what.lower()}",
        "type": type_,
        "event": what,
        "date": day.isoformat(),
        "time": time,
        "title": title,
        "detail": detail,
        "section": source,
        "record_id": record_id,
    }


def care_events(pet: Pet) -> list[dict]:
    """PET-3: one GIVEN per vaccination or treatment; vaccines are VACCINE, every other category TREATMENT."""
    events = []
    for record in pet.care_records.all():
        is_vaccine = record.category == CareRecord.Category.VACCINE
        parts = [] if is_vaccine else [record.get_category_display()]
        if record.given_by:
            parts.append(record.given_by)
        events.append(event(
            "care", record.id, "VACCINE" if is_vaccine else "TREATMENT", "GIVEN",
            record.given_on, record.name, " · ".join(parts),
        ))
    return events


def medication_schedule(medication: Medication) -> str:
    """E.g. "daily at 08:00, 20:00" or "as needed"."""
    if medication.frequency == Medication.Frequency.DAILY:
        return "daily at " + ", ".join(medication.dose_times)
    return "as needed"


def medication_events(pet: Pet, today: date) -> list[dict]:
    """PET-4: STARTED on the start date, and ENDED on the end date once that day has passed (no daily doses)."""
    events = []
    for medication in pet.medications.all():
        detail = f"{medication.dosage} · {medication_schedule(medication)}"
        events.append(event("meds", medication.id, "MEDICATION", "STARTED", medication.start_date, medication.name, detail))
        if medication.end_date and medication.end_date < today:
            events.append(event("meds", medication.id, "MEDICATION", "ENDED", medication.end_date, medication.name, detail))
    return events


def symptom_events(pet: Pet) -> list[dict]:
    """PET-6: one NOTED per symptom, on its local date and time."""
    events = []
    for log in pet.symptoms.all():
        moment = timezone.localtime(log.occurred_at)
        detail = f"{log.get_severity_display()} · {log.get_status_display()}"
        events.append(event(
            "symptoms", log.id, "SYMPTOM", "NOTED", moment.date(), log.description, detail, moment.strftime("%H:%M"),
        ))
    return events


def sort_key(item: dict) -> tuple:
    """Newest first when sorted in reverse: date, then time (events with a time before those without), then id."""
    return item["date"], item["time"] or "", item["id"]


def build_timeline(pet: Pet, today: date | None = None) -> list[dict]:
    """Every medical event of the pet, newest first."""
    today = today or timezone.localdate()
    events = care_events(pet) + medication_events(pet, today) + symptom_events(pet)
    return sorted(events, key=sort_key, reverse=True)
