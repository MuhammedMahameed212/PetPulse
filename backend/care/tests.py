from datetime import date, timedelta

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from pets.models import Pet
from pets.tests import make_user

from .models import CareRecord
from .status import DUE_SOON, OVERDUE, UP_TO_DATE, due_status, replaced_ids


def list_url(pet_id: int) -> str:
    return f"/api/pets/{pet_id}/care/"


def detail_url(pet_id: int, record_id: int) -> str:
    return f"/api/pets/{pet_id}/care/{record_id}/"


def days(n: int) -> date:
    """A date n days from today (negative = in the past)."""
    return timezone.localdate() + timedelta(days=n)


def care_payload(**overrides):
    data = {
        "category": "VACCINE",
        "name": "Rabies",
        "given_on": days(-10).isoformat(),
        "next_due": days(355).isoformat(),
        "given_by": "Dr. Levi, Haifa Vet",
        "notes": "Batch 4471",
    }
    data.update(overrides)
    return data


class US3DueStatusRuleTests(SimpleTestCase):
    """The rule on its own, without the database (care/status.py)."""

    def test_ac6_overdue_due_soon_and_up_to_date(self):
        today = date(2026, 11, 26)
        self.assertEqual(due_status(date(2026, 11, 25), False, today), OVERDUE)
        self.assertEqual(due_status(today, False, today), DUE_SOON)
        self.assertEqual(due_status(date(2026, 12, 26), False, today), DUE_SOON)  # 30 days is still "soon"
        self.assertEqual(due_status(date(2026, 12, 27), False, today), UP_TO_DATE)
        self.assertIsNone(due_status(None, False, today))
        self.assertIsNone(due_status(date(2026, 11, 25), True, today))  # replaced by a later dose

    def test_a_later_dose_of_the_same_care_replaces_the_earlier_one(self):
        records = [
            (1, "VACCINE", "Rabies", date(2025, 1, 1)),
            (2, "VACCINE", " rabies ", date(2026, 1, 1)),  # same care, other spelling
            (3, "VACCINE", "DHPP", date(2025, 1, 1)),
            (4, "OTHER", "Rabies", date(2024, 1, 1)),  # same name, other category
            (5, "FLEA_TICK", "NexGard", date(2026, 3, 1)),
            (6, "FLEA_TICK", "NexGard", date(2026, 3, 1)),  # same day: the later entry wins
        ]
        self.assertEqual(replaced_ids(records), {1, 5})


class CareApiTestCase(TestCase):
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

    def make_record(self, pet: Pet, created_by: User | None = None, **fields) -> CareRecord:
        data = {"category": "VACCINE", "name": "Rabies", "given_on": days(-30), **fields}
        return CareRecord.objects.create(pet=pet, created_by=created_by or self.owner, **data)


class US3CareRecordTests(CareApiTestCase):
    def test_ac1_ac2_owner_adds_record_and_server_sets_pet_and_author(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        res = self.client.post(
            list_url(self.pet.pk), care_payload(pet=other_pet.pk, created_by=self.other_owner.pk), format="json"
        )

        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual((body["category"], body["name"], body["given_by"]), ("VACCINE", "Rabies", "Dr. Levi, Haifa Vet"))
        self.assertEqual(body["due_status"], UP_TO_DATE)
        self.assertEqual(body["created_by"], "noa")
        self.assertTrue(body["mine"])
        record = CareRecord.objects.get(pk=body["id"])
        self.assertEqual((record.pet, record.created_by), (self.pet, self.owner))

    def test_ac2_next_due_and_extras_are_optional_and_text_is_trimmed(self):
        res = self.client.post(
            list_url(self.pet.pk),
            {"category": "DEWORMING", "name": "  Drontal ", "given_on": days(0).isoformat(), "notes": "  half a tablet "},
            format="json",
        )

        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual((body["name"], body["notes"], body["given_by"]), ("Drontal", "half a tablet", ""))
        self.assertIsNone(body["next_due"])
        self.assertIsNone(body["due_status"])

    def test_ac2_validation(self):
        cases = [
            ({"name": ""}, "name"),
            ({"name": "   "}, "name"),
            ({"name": "x" * 101}, "name"),
            ({"category": "SURGERY"}, "category"),
            ({"category": ""}, "category"),
            ({"given_on": days(1).isoformat()}, "given_on"),
            ({"given_on": None}, "given_on"),
            ({"next_due": days(-10).isoformat()}, "next_due"),  # same day as given_on
            ({"next_due": days(-20).isoformat()}, "next_due"),  # before it
            ({"notes": "x" * 2001}, "notes"),
        ]
        for overrides, field in cases:
            with self.subTest(overrides=overrides):
                res = self.client.post(list_url(self.pet.pk), care_payload(**overrides), format="json")
                self.assertEqual(res.status_code, 400, res.content)
                self.assertIn(field, res.json())
        self.assertEqual(CareRecord.objects.count(), 0)

    def test_ac3_history_is_newest_first_and_only_this_pet(self):
        old = self.make_record(self.pet, given_on=days(-400))
        new = self.make_record(self.pet, name="DHPP", given_on=days(-5))
        self.make_record(self.make_pet(self.owner, "Luna"))

        res = self.client.get(list_url(self.pet.pk))

        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["id"] for r in res.json()], [new.pk, old.pk])

    def test_ac3_history_filters_by_category(self):
        vaccine = self.make_record(self.pet)
        flea = self.make_record(self.pet, category="FLEA_TICK", name="NexGard")

        def ids(query):
            return [r["id"] for r in self.client.get(list_url(self.pet.pk) + query).json()]

        self.assertEqual(ids("?category=VACCINE"), [vaccine.pk])
        self.assertEqual(ids("?category=FLEA_TICK"), [flea.pk])
        self.assertEqual(len(ids("?category=nonsense")), 2)  # unknown filter = everything

    def test_ac6_recording_the_next_dose_replaces_the_old_one(self):
        old = self.make_record(self.pet, given_on=days(-400), next_due=days(-35))
        flea = self.make_record(self.pet, category="FLEA_TICK", name="NexGard", next_due=days(10))

        self.assertEqual(self.client.get(detail_url(self.pet.pk, old.pk)).json()["due_status"], OVERDUE)
        new = self.client.post(list_url(self.pet.pk), care_payload(name="rabies"), format="json").json()

        statuses = {r["id"]: r["due_status"] for r in self.client.get(list_url(self.pet.pk)).json()}
        self.assertEqual(statuses, {old.pk: None, new["id"]: UP_TO_DATE, flea.pk: DUE_SOON})
        # the replaced record stays replaced even when the list is filtered to another category
        filtered = self.client.get(list_url(self.pet.pk) + "?category=VACCINE").json()
        self.assertEqual({r["id"]: r["due_status"] for r in filtered}, {old.pk: None, new["id"]: UP_TO_DATE})

    def test_ac4_author_edits_record(self):
        record = self.make_record(self.pet, next_due=days(300))

        res = self.client.patch(detail_url(self.pet.pk, record.pk), {"notes": "Mild swelling"}, format="json")

        self.assertEqual(res.status_code, 200, res.content)
        record.refresh_from_db()
        self.assertEqual((record.notes, record.name), ("Mild swelling", "Rabies"))

    def test_ac4_edit_checks_next_due_against_the_stored_date_given(self):
        record = self.make_record(self.pet, given_on=days(-30))

        res = self.client.patch(detail_url(self.pet.pk, record.pk), {"next_due": days(-40).isoformat()}, format="json")

        self.assertEqual(res.status_code, 400)
        self.assertIn("next_due", res.json())

    def test_ac4_author_deletes_record(self):
        record = self.make_record(self.pet)

        self.assertEqual(self.client.delete(detail_url(self.pet.pk, record.pk)).status_code, 204)
        self.assertFalse(CareRecord.objects.filter(pk=record.pk).exists())

    def test_ac4_only_the_author_can_change_a_record(self):
        # Until PET-21 only the owner reaches the pet, so a record by someone else is set up directly.
        record = self.make_record(self.pet, created_by=self.other_owner)

        self.assertFalse(self.client.get(detail_url(self.pet.pk, record.pk)).json()["mine"])
        self.assertEqual(self.client.patch(detail_url(self.pet.pk, record.pk), {"notes": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(detail_url(self.pet.pk, record.pk)).status_code, 403)
        self.assertTrue(CareRecord.objects.filter(pk=record.pk).exists())

    def test_records_are_deleted_with_the_pet(self):
        self.make_record(self.pet)
        self.pet.delete()
        self.assertEqual(CareRecord.objects.count(), 0)


class US3CareAccessTests(CareApiTestCase):
    def test_other_owners_get_404_vets_403_and_anonymous_401(self):
        record = self.make_record(self.pet)

        my_other_pet = self.make_pet(self.owner, "Luna")
        # a record is only reachable through its own pet
        self.assertEqual(self.client.get(detail_url(my_other_pet.pk, record.pk)).status_code, 404)

        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 404)
        self.assertEqual(self.client.post(list_url(self.pet.pk), care_payload(), format="json").status_code, 404)
        self.assertEqual(self.client.patch(detail_url(self.pet.pk, record.pk), {"notes": "x"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(detail_url(self.pet.pk, record.pk)).status_code, 404)

        # AC5 waits for PET-21: until then vets get 403
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 403)
        self.assertEqual(self.client.post(list_url(self.pet.pk), care_payload(), format="json").status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 401)

        record.refresh_from_db()
        self.assertEqual(record.notes, "")
