from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from care.models import CareRecord
from medications.models import Medication
from pets.models import Pet
from pets.tests import make_user
from symptoms.models import SymptomLog

LOCAL = ZoneInfo("Asia/Jerusalem")


def file_url(pet_id: int) -> str:
    return f"/api/pets/{pet_id}/medical-file/"


def days(n: int) -> date:
    """A date n days from today (negative = in the past)."""
    return timezone.localdate() + timedelta(days=n)


class MedicalFileTestCase(TestCase):
    def setUp(self):
        self.owner = make_user("noa")
        self.other_owner = make_user("dana")
        self.vet = make_user("dr_levi", role=User.Role.VETERINARIAN)
        self.pet = self.make_pet(self.owner, "Milo")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    @staticmethod
    def make_pet(owner: User, name: str) -> Pet:
        return Pet.objects.create(
            owner=owner, name=name, species="DOG", birth_date=date(2024, 7, 2), weight_kg="28.40"
        )

    def care(self, pet=None, **fields) -> CareRecord:
        data = {"category": "VACCINE", "name": "Rabies", "given_on": days(-30), **fields}
        return CareRecord.objects.create(pet=pet or self.pet, created_by=self.owner, **data)

    def medication(self, pet=None, **fields) -> Medication:
        data = {
            "name": "Amoxicillin", "dosage": "250 mg", "frequency": "DAILY",
            "dose_times": ["08:00", "20:00"], "start_date": days(-20), **fields,
        }
        return Medication.objects.create(pet=pet or self.pet, created_by=self.owner, **data)

    def symptom(self, pet=None, **fields) -> SymptomLog:
        data = {"description": "Limping", "severity": "MODERATE", "status": "ONGOING",
                "occurred_at": timezone.now() - timedelta(days=5), **fields}
        return SymptomLog.objects.create(pet=pet or self.pet, created_by=self.owner, **data)

    def timeline(self) -> list[dict]:
        res = self.client.get(file_url(self.pet.pk))
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()


class US2MedicalFileTests(MedicalFileTestCase):
    def test_ac2_vaccine_and_treatments_come_from_care_records(self):
        vaccine = self.care(given_by="Dr. Levi")
        flea = self.care(category="FLEA_TICK", name="NexGard", given_on=days(-40))
        self.care(category="DEWORMING", name="Drontal", given_on=days(-50))

        events = self.timeline()

        self.assertEqual([(e["type"], e["title"]) for e in events],
                         [("VACCINE", "Rabies"), ("TREATMENT", "NexGard"), ("TREATMENT", "Drontal")])
        self.assertEqual(events[0], {
            "id": f"care-{vaccine.pk}-given", "type": "VACCINE", "event": "GIVEN",
            "date": days(-30).isoformat(), "time": None, "title": "Rabies", "detail": "Dr. Levi",
            "section": "care", "record_id": vaccine.pk,
        })
        self.assertEqual(events[1]["detail"], "Flea & tick")
        self.assertEqual(events[1]["record_id"], flea.pk)

    def test_ac2_medication_started_and_ended_only_once_the_end_has_passed(self):
        ended = self.medication(start_date=days(-20), end_date=days(-10))
        self.medication(name="Carprofen", dosage="1 tablet", frequency="AS_NEEDED", dose_times=[],
                        start_date=days(-3), end_date=days(0))  # ends today: no ENDED yet

        events = [(e["event"], e["title"], e["date"]) for e in self.timeline()]

        self.assertEqual(events, [
            ("STARTED", "Carprofen", days(-3).isoformat()),
            ("ENDED", "Amoxicillin", days(-10).isoformat()),
            ("STARTED", "Amoxicillin", days(-20).isoformat()),
        ])
        detail = next(e["detail"] for e in self.timeline() if e["id"] == f"meds-{ended.pk}-started")
        self.assertEqual(detail, "250 mg · daily at 08:00, 20:00")

    def test_ac2_symptom_uses_its_local_date_and_time(self):
        # 23:30 UTC on 1 Nov is 01:30 on 2 Nov in Israel: the file must show the local day
        log = self.symptom(occurred_at=datetime(2025, 11, 1, 23, 30, tzinfo=ZoneInfo("UTC")))

        [item] = self.timeline()

        self.assertEqual((item["date"], item["time"]), ("2025-11-02", "01:30"))
        self.assertEqual((item["type"], item["event"], item["section"]), ("SYMPTOM", "NOTED", "symptoms"))
        self.assertEqual((item["title"], item["detail"], item["record_id"]), ("Limping", "Moderate · Ongoing", log.pk))

    def test_ac4_newest_first_and_later_time_first_on_the_same_day(self):
        day = days(-2)
        self.care(given_on=day)
        self.symptom(description="Morning", occurred_at=datetime.combine(day, datetime.min.time(), LOCAL) + timedelta(hours=8))
        self.symptom(description="Evening", occurred_at=datetime.combine(day, datetime.min.time(), LOCAL) + timedelta(hours=20))
        self.medication(start_date=days(-1))
        self.care(name="DHPP", given_on=days(-100))

        titles = [e["title"] for e in self.timeline()]

        self.assertEqual(titles, ["Amoxicillin", "Evening", "Morning", "Rabies", "DHPP"])

    def test_ac5_history_keeps_replaced_doses_and_only_this_pet(self):
        self.care(given_on=days(-400))
        self.care(given_on=days(-30))  # the next dose: both stay in the file
        other_pet = self.make_pet(self.owner, "Luna")
        self.care(pet=other_pet)
        self.symptom(pet=other_pet)

        self.assertEqual(len(self.timeline()), 2)

    def test_empty_file(self):
        self.assertEqual(self.timeline(), [])


class US2MedicalFileAccessTests(MedicalFileTestCase):
    def test_other_owners_get_404_vets_403_and_anonymous_401(self):
        self.care()

        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.get(file_url(self.pet.pk)).status_code, 404)

        # AC6 waits for PET-21: until then vets get 403
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(file_url(self.pet.pk)).status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(file_url(self.pet.pk)).status_code, 401)

    def test_the_file_is_read_only(self):
        self.assertEqual(self.client.post(file_url(self.pet.pk), {}, format="json").status_code, 405)
