from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from pets.models import Pet
from pets.tests import make_user

from .due import due_doses
from .models import DoseLog, Medication


def list_url(pet_id: int) -> str:
    return f"/api/pets/{pet_id}/medications/"


def detail_url(pet_id: int, med_id: int) -> str:
    return f"/api/pets/{pet_id}/medications/{med_id}/"


def med_payload(**overrides):
    data = {
        "name": "Carprofen",
        "dosage": "1 tablet (25 mg)",
        "frequency": "DAILY",
        "dose_times": ["20:00", "08:00"],
        "start_date": date.today().isoformat(),
        "end_date": (date.today() + timedelta(days=14)).isoformat(),
        "notes": "With food",
    }
    data.update(overrides)
    return data


class MedicationApiTestCase(TestCase):
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

    def make_med(self, pet: Pet, **fields) -> Medication:
        data = {**med_payload(), **fields}
        for key in ("start_date", "end_date"):
            data[key] = date.fromisoformat(data[key]) if data[key] else None
        return Medication.objects.create(pet=pet, **data)


class US4ManageMedicationsTests(MedicationApiTestCase):
    def test_ac1_ac2_owner_adds_daily_medication_and_server_sets_pet_and_creator(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        res = self.client.post(
            list_url(self.pet.pk),
            med_payload(pet=other_pet.pk, created_by=self.other_owner.pk),
            format="json",
        )

        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["dose_times"], ["08:00", "20:00"])
        self.assertTrue(body["is_active"])
        med = Medication.objects.get(pk=body["id"])
        self.assertEqual(med.pet, self.pet)
        self.assertEqual(med.created_by, self.owner)

    def test_ac2_as_needed_medication_has_no_times_and_end_date_is_optional(self):
        res = self.client.post(
            list_url(self.pet.pk),
            med_payload(name="Gabapentin", frequency="AS_NEEDED", dose_times=[], end_date=None),
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["dose_times"], [])
        self.assertIsNone(res.json()["end_date"])

    def test_list_shows_only_this_pets_medications_with_ended_ones_last(self):
        today = date.today()
        self.make_med(self.pet, name="Amoxicillin", start_date=(today - timedelta(days=20)).isoformat(),
                      end_date=(today - timedelta(days=10)).isoformat())
        self.make_med(self.pet, name="Carprofen")
        self.make_med(self.make_pet(self.owner, "Luna"), name="Other pet's medicine")

        res = self.client.get(list_url(self.pet.pk))

        self.assertEqual(res.status_code, 200)
        self.assertEqual([(m["name"], m["is_active"]) for m in res.json()],
                         [("Carprofen", True), ("Amoxicillin", False)])

    def test_owner_edits_and_deletes_a_medication(self):
        med = self.make_med(self.pet)

        res = self.client.patch(detail_url(self.pet.pk, med.pk), {"dose_times": ["09:30"]}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["dose_times"], ["09:30"])

        res = self.client.patch(detail_url(self.pet.pk, med.pk), {"frequency": "AS_NEEDED"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["dose_times"], [])

        # back to daily without sending times: refused, not saved as a daily medicine with no times
        res = self.client.patch(detail_url(self.pet.pk, med.pk), {"frequency": "DAILY"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("dose_times", res.json())

        self.assertEqual(self.client.delete(detail_url(self.pet.pk, med.pk)).status_code, 204)
        self.assertFalse(Medication.objects.filter(pk=med.pk).exists())

    def test_invalid_medications_are_rejected(self):
        today = date.today()
        cases = [
            ("name", {"name": ""}),
            ("dosage", {"dosage": ""}),
            ("frequency", {"frequency": "WEEKLY"}),
            ("dose_times", {"dose_times": []}),
            ("dose_times", {"dose_times": ["8am"]}),
            ("dose_times", {"dose_times": ["24:00"]}),
            ("dose_times", {"dose_times": ["08:00", "08:00"]}),
            ("dose_times", {"dose_times": [f"{h:02d}:00" for h in range(7)]}),
            ("dose_times", {"frequency": "AS_NEEDED", "dose_times": ["08:00"]}),
            ("end_date", {"end_date": (today - timedelta(days=1)).isoformat()}),
        ]
        for field, overrides in cases:
            with self.subTest(overrides=overrides):
                res = self.client.post(list_url(self.pet.pk), med_payload(**overrides), format="json")
                self.assertEqual(res.status_code, 400)
                self.assertIn(field, res.json())
        self.assertEqual(Medication.objects.count(), 0)

    def test_ac7_hook_other_owners_vets_and_anonymous_are_kept_out(self):
        med = self.make_med(self.pet)
        my_other_pet = self.make_pet(self.owner, "Luna")

        # a medicine is only reachable through its own pet
        self.assertEqual(self.client.get(detail_url(my_other_pet.pk, med.pk)).status_code, 404)

        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 404)
        self.assertEqual(self.client.post(list_url(self.pet.pk), med_payload(), format="json").status_code, 404)
        self.assertEqual(self.client.patch(detail_url(self.pet.pk, med.pk), {"name": "x"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(detail_url(self.pet.pk, med.pk)).status_code, 404)

        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 403)
        self.assertEqual(self.client.post(list_url(self.pet.pk), med_payload(), format="json").status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 401)

        med.refresh_from_db()
        self.assertEqual(med.name, "Carprofen")


def doses_url(pet_id: int, med_id: int, dose_id: int | None = None) -> str:
    return f"/api/pets/{pet_id}/medications/{med_id}/doses/" + (f"{dose_id}/" if dose_id else "")


class US4DoseTrackingTests(MedicationApiTestCase):
    def setUp(self):
        super().setUp()
        self.med = self.make_med(self.pet)  # daily at 08:00 and 20:00, active today

    def mark(self, med: Medication, time: str | None = "08:00"):
        body = {"scheduled_time": time} if time else {}
        return self.client.post(doses_url(self.pet.pk, med.pk), body, format="json")

    def today_slots(self, med: Medication) -> list:
        return next(m for m in self.client.get(list_url(self.pet.pk)).json() if m["id"] == med.pk)["today"]

    def test_ac4_ac5_marking_records_today_the_time_and_the_user(self):
        before = timezone.now()
        res = self.mark(self.med, "08:00")

        self.assertEqual(res.status_code, 201, res.content)
        dose = DoseLog.objects.get()
        self.assertEqual(dose.scheduled_date, timezone.localdate())
        self.assertEqual(dose.scheduled_time.strftime("%H:%M"), "08:00")
        self.assertEqual(dose.given_by, self.owner)
        self.assertGreaterEqual(dose.given_at, before)

        slots = self.today_slots(self.med)
        self.assertEqual([s["time"] for s in slots], ["08:00", "20:00"])
        self.assertEqual(slots[0]["dose"]["given_by"], "noa")
        self.assertTrue(slots[0]["dose"]["mine"])
        self.assertIsNone(slots[1]["dose"])

    def test_the_same_daily_dose_cannot_be_marked_twice(self):
        self.assertEqual(self.mark(self.med).status_code, 201)
        res = self.mark(self.med)
        self.assertEqual(res.status_code, 400)
        self.assertIn("scheduled_time", res.json())
        self.assertEqual(DoseLog.objects.count(), 1)

    def test_only_this_medicines_times_on_an_active_day_can_be_marked(self):
        today = timezone.localdate()
        ended = self.make_med(self.pet, name="Ended", start_date=(today - timedelta(days=9)).isoformat(),
                              end_date=(today - timedelta(days=1)).isoformat())
        future = self.make_med(self.pet, name="Future", start_date=(today + timedelta(days=1)).isoformat(),
                               end_date=None)
        cases = [(self.med, "09:00"), (self.med, None), (ended, "08:00"), (future, "08:00")]
        for med, time in cases:
            with self.subTest(med=med.name, time=time):
                self.assertEqual(self.mark(med, time).status_code, 400)
        self.assertEqual(self.today_slots(ended), [])
        self.assertEqual(DoseLog.objects.count(), 0)

    def test_as_needed_doses_can_be_logged_many_times_without_a_time(self):
        prn = self.make_med(self.pet, name="Gabapentin", frequency="AS_NEEDED", dose_times=[])
        self.assertEqual(self.mark(prn, "08:00").status_code, 400)
        self.assertEqual(self.mark(prn, None).status_code, 201)
        self.assertEqual(self.mark(prn, None).status_code, 201)
        slots = self.today_slots(prn)
        self.assertEqual(len(slots), 2)
        self.assertIsNone(slots[0]["time"])

    def test_undo_is_allowed_only_for_your_own_mark_from_today(self):
        dose_id = self.mark(self.med).json()["id"]
        family = make_user("family")  # a second owner account stands in for another user of a shared pet
        DoseLog.objects.filter(pk=dose_id).update(given_by=family)
        self.assertEqual(self.client.delete(doses_url(self.pet.pk, self.med.pk, dose_id)).status_code, 403)

        DoseLog.objects.filter(pk=dose_id).update(given_by=self.owner, scheduled_date=timezone.localdate() - timedelta(days=1))
        self.assertEqual(self.client.delete(doses_url(self.pet.pk, self.med.pk, dose_id)).status_code, 400)

        DoseLog.objects.filter(pk=dose_id).update(scheduled_date=timezone.localdate())
        self.assertEqual(self.client.delete(doses_url(self.pet.pk, self.med.pk, dose_id)).status_code, 204)
        self.assertFalse(DoseLog.objects.exists())

    def test_changed_times_keep_todays_doses_at_the_old_time(self):
        self.mark(self.med, "20:00")
        self.client.patch(detail_url(self.pet.pk, self.med.pk), {"dose_times": ["09:00"]}, format="json")
        slots = self.today_slots(self.med)
        self.assertEqual([(s["time"], s["dose"] is not None) for s in slots], [("09:00", False), ("20:00", True)])

    def test_other_owners_and_vets_cannot_mark_or_undo(self):
        dose_id = self.mark(self.med).json()["id"]
        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.mark(self.med, "20:00").status_code, 404)
        self.assertEqual(self.client.delete(doses_url(self.pet.pk, self.med.pk, dose_id)).status_code, 404)
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.mark(self.med, "20:00").status_code, 403)
        self.assertEqual(DoseLog.objects.count(), 1)

    def test_switching_as_needed_to_daily_keeps_the_list_working(self):
        prn = self.make_med(self.pet, name="Gabapentin", frequency="AS_NEEDED", dose_times=[])
        self.assertEqual(self.mark(prn, None).status_code, 201)

        res = self.client.patch(detail_url(self.pet.pk, prn.pk), {"frequency": "DAILY", "dose_times": ["08:00"]}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual([s["time"] for s in self.today_slots(prn)], ["08:00"])


NOON = timezone.make_aware(datetime(2026, 11, 26, 12, 0))  # a fixed "now", in Asia/Jerusalem
DUE_DOSES_URL = "/api/medications/due-doses/"


class US4DueDoseRemindersTests(MedicationApiTestCase):
    """PET-5 (US-4 AC3): today's daily doses whose time has come and that nobody marked as given."""

    def setUp(self):
        super().setUp()
        self.today = NOON.date()

    def daily(self, pet=None, **fields):
        data = {"dose_times": ["08:00", "11:59", "12:00", "20:00"], "start_date": "2026-11-01", "end_date": None, **fields}
        return self.make_med(pet or self.pet, **data)

    def due(self):
        return [(d["name"], d["time"]) for d in due_doses(self.owner, NOON)]

    def test_lists_passed_doses_not_given_yet(self):
        self.daily()
        self.assertEqual(self.due(), [("Carprofen", "08:00"), ("Carprofen", "11:59"), ("Carprofen", "12:00")])

    def test_a_given_dose_is_not_due(self):
        med = self.daily()
        DoseLog.objects.create(medication=med, scheduled_date=self.today, scheduled_time=time(8, 0), given_by=self.owner)
        self.assertEqual(self.due(), [("Carprofen", "11:59"), ("Carprofen", "12:00")])

    def test_yesterdays_given_dose_does_not_count_for_today(self):
        med = self.daily(dose_times=["08:00"])
        DoseLog.objects.create(
            medication=med, scheduled_date=self.today - timedelta(days=1), scheduled_time=time(8, 0), given_by=self.owner
        )
        self.assertEqual(self.due(), [("Carprofen", "08:00")])

    def test_ended_not_started_and_as_needed_medicines_are_not_due(self):
        self.daily(name="Ended", end_date="2026-11-25")
        self.daily(name="Later", start_date="2026-11-27")
        self.daily(name="Spray", frequency="AS_NEEDED", dose_times=[])
        self.daily(name="Last day", dose_times=["08:00"], end_date="2026-11-26")
        self.assertEqual(self.due(), [("Last day", "08:00")])

    def test_only_the_callers_pets(self):
        luna = self.make_pet(self.owner, "Luna")
        self.daily(luna, name="Luna's", dose_times=["09:00"])
        self.daily(self.make_pet(self.other_owner, "Bella"), name="Not mine", dose_times=["09:00"])
        doses = due_doses(self.owner, NOON)
        self.assertEqual([(d["name"], d["pet_name"]) for d in doses], [("Luna's", "Luna")])
        self.assertEqual(doses[0]["pet"], luna.pk)
        self.assertEqual(doses[0]["date"], "2026-11-26")

    def test_endpoint_returns_due_doses_soonest_first(self):
        luna = self.make_pet(self.owner, "Luna")
        self.daily(name="B", dose_times=["10:00"])
        self.daily(luna, name="A", dose_times=["07:30"])
        with patch("django.utils.timezone.now", return_value=NOON):
            res = self.client.get(DUE_DOSES_URL)

        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual([(d["name"], d["time"]) for d in res.json()], [("A", "07:30"), ("B", "10:00")])
        self.assertEqual(set(res.json()[0]), {"medication", "pet", "pet_name", "name", "dosage", "date", "time"})

    def test_endpoint_vet_403_and_signed_out_401(self):
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(DUE_DOSES_URL).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(DUE_DOSES_URL).status_code, 401)
