from datetime import date, datetime, timedelta

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from medications.models import Medication
from pets.models import Pet
from pets.tests import make_user

from .models import Reminder
from .recurrence import next_due


def list_url(pet_id: int) -> str:
    return f"/api/pets/{pet_id}/reminders/"


def detail_url(pet_id: int, reminder_id: int) -> str:
    return f"/api/pets/{pet_id}/reminders/{reminder_id}/"


def in_days(days: int):
    """An aware datetime `days` from now, at 09:00 local time."""
    moment = timezone.localtime() + timedelta(days=days)
    return moment.replace(hour=9, minute=0, second=0, microsecond=0)


def reminder_payload(**overrides):
    data = {
        "kind": "VACCINATION",
        "title": "Rabies booster",
        "due_at": in_days(5).isoformat(),
        "repeat": "YEARLY",
        "notes": "Bring the vaccine booklet",
    }
    data.update(overrides)
    return data


class ReminderApiTestCase(TestCase):
    def setUp(self):
        self.owner = make_user("noa")
        self.other_owner = make_user("dana")
        self.vet = make_user("dr_levi", role=User.Role.VETERINARIAN)
        self.pet = self.make_pet(self.owner, "Milo")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    @staticmethod
    def make_pet(owner: User, name: str) -> Pet:
        return Pet.objects.create(owner=owner, name=name, species="DOG", birth_date=date(2024, 7, 2), weight_kg="28.40")

    def make_reminder(self, pet: Pet, **fields) -> Reminder:
        data = {"kind": "VET_VISIT", "title": "Check-up", "due_at": in_days(3), **fields}
        return Reminder.objects.create(pet=pet, **data)


class US5ManageRemindersTests(ReminderApiTestCase):
    def test_ac1_ac2_owner_adds_reminder_and_server_sets_pet_and_creator(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        res = self.client.post(
            list_url(self.pet.pk),
            reminder_payload(pet=other_pet.pk, created_by=self.other_owner.pk, done_at=timezone.now().isoformat()),
            format="json",
        )

        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["kind"], "VACCINATION")
        self.assertEqual(body["repeat"], "YEARLY")
        self.assertEqual(body["pet_name"], "Milo")
        self.assertIsNone(body["done_at"])
        self.assertFalse(body["is_due"])
        reminder = Reminder.objects.get(pk=body["id"])
        self.assertEqual(reminder.pet, self.pet)
        self.assertEqual(reminder.created_by, self.owner)
        self.assertIsNone(reminder.done_at)

    def test_ac1_every_kind_is_accepted(self):
        for kind in ("MEDICATION", "VACCINATION", "TREATMENT", "VET_VISIT"):
            res = self.client.post(list_url(self.pet.pk), reminder_payload(kind=kind), format="json")
            self.assertEqual(res.status_code, 201, (kind, res.content))

    def test_ac2_type_title_and_date_time_are_required(self):
        for field in ("kind", "title", "due_at"):
            payload = reminder_payload()
            del payload[field]
            res = self.client.post(list_url(self.pet.pk), payload, format="json")
            self.assertEqual(res.status_code, 400, field)
            self.assertIn(field, res.json())

    def test_ac2_title_is_trimmed_and_blank_title_refused(self):
        res = self.client.post(list_url(self.pet.pk), reminder_payload(title="  Flea drops  "), format="json")
        self.assertEqual(res.json()["title"], "Flea drops")

        res = self.client.post(list_url(self.pet.pk), reminder_payload(title="   "), format="json")
        self.assertEqual(res.status_code, 400)

    def test_ac2_bad_kind_and_repeat_are_refused(self):
        res = self.client.post(list_url(self.pet.pk), reminder_payload(kind="GROOMING"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("kind", res.json())

        res = self.client.post(list_url(self.pet.pk), reminder_payload(repeat="DAILY"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("repeat", res.json())

    def test_ac2_repeat_defaults_to_none_and_past_time_is_due(self):
        payload = reminder_payload(due_at=in_days(-1).isoformat())
        del payload["repeat"]
        res = self.client.post(list_url(self.pet.pk), payload, format="json")

        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["repeat"], "NONE")
        self.assertTrue(res.json()["is_due"])

    def test_ac4_owner_edits_reminder(self):
        reminder = self.make_reminder(self.pet)
        new_time = in_days(10)
        res = self.client.patch(
            detail_url(self.pet.pk, reminder.pk),
            {"title": "Annual check-up", "due_at": new_time.isoformat()},
            format="json",
        )

        self.assertEqual(res.status_code, 200, res.content)
        reminder.refresh_from_db()
        self.assertEqual(reminder.title, "Annual check-up")
        self.assertEqual(reminder.due_at, new_time)

    def test_ac4_owner_deletes_reminder(self):
        reminder = self.make_reminder(self.pet)
        res = self.client.delete(detail_url(self.pet.pk, reminder.pk))

        self.assertEqual(res.status_code, 204)
        self.assertFalse(Reminder.objects.filter(pk=reminder.pk).exists())

    def test_ac5_open_reminders_listed_soonest_first(self):
        later = self.make_reminder(self.pet, title="Later", due_at=in_days(9))
        overdue = self.make_reminder(self.pet, title="Overdue", due_at=in_days(-2))
        soon = self.make_reminder(self.pet, title="Soon", due_at=in_days(1))
        self.make_reminder(self.pet, title="Done", done_at=timezone.now())

        res = self.client.get(list_url(self.pet.pk))

        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["id"] for r in res.json()], [overdue.pk, soon.pk, later.pk])
        self.assertEqual([r["is_due"] for r in res.json()], [True, False, False])

    def test_ac5_done_filter_lists_done_reminders_latest_first(self):
        self.make_reminder(self.pet, title="Open")
        older = self.make_reminder(self.pet, title="Older", done_at=timezone.now() - timedelta(days=3))
        newer = self.make_reminder(self.pet, title="Newer", done_at=timezone.now())

        res = self.client.get(list_url(self.pet.pk), {"status": "done"})

        self.assertEqual([r["id"] for r in res.json()], [newer.pk, older.pk])

    def test_done_reminder_still_opens_by_id(self):
        reminder = self.make_reminder(self.pet, done_at=timezone.now())
        res = self.client.get(detail_url(self.pet.pk, reminder.pk))
        self.assertEqual(res.status_code, 200)

    def test_reminders_are_deleted_with_their_pet(self):
        reminder = self.make_reminder(self.pet)
        self.pet.delete()
        self.assertFalse(Reminder.objects.filter(pk=reminder.pk).exists())


class US5ReminderAccessTests(ReminderApiTestCase):
    def test_other_owners_pet_answers_404_on_every_endpoint(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        reminder = self.make_reminder(other_pet)

        self.assertEqual(self.client.get(list_url(other_pet.pk)).status_code, 404)
        self.assertEqual(self.client.post(list_url(other_pet.pk), reminder_payload(), format="json").status_code, 404)
        self.assertEqual(self.client.get(detail_url(other_pet.pk, reminder.pk)).status_code, 404)
        self.assertEqual(self.client.patch(detail_url(other_pet.pk, reminder.pk), {}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(detail_url(other_pet.pk, reminder.pk)).status_code, 404)
        self.assertTrue(Reminder.objects.filter(pk=reminder.pk).exists())

    def test_reminder_of_another_pet_is_not_reachable_through_my_pet(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        reminder = self.make_reminder(other_pet)
        self.assertEqual(self.client.get(detail_url(self.pet.pk, reminder.pk)).status_code, 404)

    def test_vet_gets_403(self):
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 403)

    def test_signed_out_user_gets_401(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 401)


def done_url(pet_id: int, reminder_id: int) -> str:
    return f"/api/pets/{pet_id}/reminders/{reminder_id}/done/"


def local(*args):
    """An aware datetime in the project time zone (Asia/Jerusalem)."""
    return timezone.make_aware(datetime(*args))


class NextDueTests(SimpleTestCase):
    def test_weekly_moves_seven_days_and_keeps_the_time(self):
        self.assertEqual(next_due(local(2026, 11, 26, 9, 30), "WEEKLY"), local(2026, 12, 3, 9, 30))

    def test_weekly_keeps_the_local_time_across_a_clock_change(self):
        # Israel moves clocks back on 25 Oct 2026; 09:00 stays 09:00 local time.
        self.assertEqual(next_due(local(2026, 10, 20, 9, 0), "WEEKLY"), local(2026, 10, 27, 9, 0))

    def test_monthly_moves_one_month(self):
        self.assertEqual(next_due(local(2026, 11, 15, 8, 0), "MONTHLY"), local(2026, 12, 15, 8, 0))
        self.assertEqual(next_due(local(2026, 12, 15, 8, 0), "MONTHLY"), local(2027, 1, 15, 8, 0))

    def test_monthly_on_the_31st_falls_back_to_the_last_day(self):
        self.assertEqual(next_due(local(2027, 1, 31, 8, 0), "MONTHLY"), local(2027, 2, 28, 8, 0))
        self.assertEqual(next_due(local(2028, 1, 31, 8, 0), "MONTHLY"), local(2028, 2, 29, 8, 0))

    def test_yearly_moves_one_year_and_leap_day_falls_back(self):
        self.assertEqual(next_due(local(2026, 12, 1, 9, 0), "YEARLY"), local(2027, 12, 1, 9, 0))
        self.assertEqual(next_due(local(2028, 2, 29, 9, 0), "YEARLY"), local(2029, 2, 28, 9, 0))

    def test_no_repeat_has_no_next(self):
        self.assertIsNone(next_due(local(2026, 12, 1, 9, 0), "NONE"))


class US5MarkDoneTests(ReminderApiTestCase):
    def test_ac7_mark_done_records_when_and_who(self):
        reminder = self.make_reminder(self.pet, repeat="NONE", due_at=in_days(-1))
        res = self.client.post(done_url(self.pet.pk, reminder.pk))

        self.assertEqual(res.status_code, 200, res.content)
        self.assertIsNone(res.json()["next"])
        self.assertEqual(res.json()["done"]["done_by"], "noa")
        reminder.refresh_from_db()
        self.assertIsNotNone(reminder.done_at)
        self.assertEqual(reminder.done_by, self.owner)
        self.assertEqual(Reminder.objects.count(), 1)

    def test_ac7_repeating_reminder_creates_the_next_one_from_the_old_due_time(self):
        due = local(2026, 3, 1, 9, 0)  # marked done late: the next one still keys off 1 March
        reminder = self.make_reminder(
            self.pet, kind="TREATMENT", title="Flea drops", due_at=due, repeat="MONTHLY", notes="Back of the neck"
        )
        res = self.client.post(done_url(self.pet.pk, reminder.pk))

        self.assertEqual(res.status_code, 200, res.content)
        nxt = Reminder.objects.get(pk=res.json()["next"]["id"])
        self.assertEqual(nxt.due_at, local(2026, 4, 1, 9, 0))
        self.assertEqual(
            (nxt.pet, nxt.kind, nxt.title, nxt.repeat, nxt.notes),
            (self.pet, "TREATMENT", "Flea drops", "MONTHLY", "Back of the neck"),
        )
        self.assertIsNone(nxt.done_at)
        self.assertEqual(nxt.created_by, self.owner)

    def test_ac7_done_reminder_moves_from_upcoming_to_done(self):
        reminder = self.make_reminder(self.pet, repeat="NONE", due_at=in_days(-1))
        self.client.post(done_url(self.pet.pk, reminder.pk))

        self.assertEqual(self.client.get(list_url(self.pet.pk)).json(), [])
        self.assertEqual([r["id"] for r in self.client.get(list_url(self.pet.pk), {"status": "done"}).json()], [reminder.pk])

    def test_marking_done_twice_is_refused(self):
        reminder = self.make_reminder(self.pet, repeat="YEARLY", due_at=in_days(-1))
        self.client.post(done_url(self.pet.pk, reminder.pk))
        res = self.client.post(done_url(self.pet.pk, reminder.pk))

        self.assertEqual(res.status_code, 400)
        self.assertEqual(Reminder.objects.count(), 2)  # the first tick's next one, no third

    def test_ac7_future_reminder_cannot_be_marked_done_yet(self):
        reminder = self.make_reminder(self.pet, due_at=in_days(1))
        res = self.client.post(done_url(self.pet.pk, reminder.pk))

        self.assertEqual(res.status_code, 400)
        reminder.refresh_from_db()
        self.assertIsNone(reminder.done_at)

    def test_ac7_reminder_can_be_marked_done_from_the_start_of_its_due_day(self):
        end_of_today = timezone.localtime().replace(hour=23, minute=59, second=0, microsecond=0)
        reminder = self.make_reminder(self.pet, due_at=end_of_today)
        self.assertTrue(self.client.get(detail_url(self.pet.pk, reminder.pk)).json()["can_mark_done"])
        self.assertEqual(self.client.post(done_url(self.pet.pk, reminder.pk)).status_code, 200)

    def test_repeated_clicks_cannot_tick_the_next_reminder(self):
        reminder = self.make_reminder(self.pet, repeat="WEEKLY", due_at=in_days(-1))
        nxt_id = self.client.post(done_url(self.pet.pk, reminder.pk)).json()["next"]["id"]

        self.assertFalse(self.client.get(detail_url(self.pet.pk, nxt_id)).json()["can_mark_done"])
        self.assertEqual(self.client.post(done_url(self.pet.pk, nxt_id)).status_code, 400)
        self.assertEqual(Reminder.objects.filter(done_at__isnull=True).count(), 1)

    def test_done_reminder_cannot_be_edited_but_can_be_deleted(self):
        reminder = self.make_reminder(self.pet, done_at=timezone.now())
        res = self.client.patch(detail_url(self.pet.pk, reminder.pk), {"title": "Changed"}, format="json")

        self.assertEqual(res.status_code, 400)
        reminder.refresh_from_db()
        self.assertEqual(reminder.title, "Check-up")
        self.assertEqual(self.client.delete(detail_url(self.pet.pk, reminder.pk)).status_code, 204)

    def test_other_owners_reminder_cannot_be_marked_done(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        reminder = self.make_reminder(other_pet)

        self.assertEqual(self.client.post(done_url(other_pet.pk, reminder.pk)).status_code, 404)
        reminder.refresh_from_db()
        self.assertIsNone(reminder.done_at)


class US5MedicineLinkTests(ReminderApiTestCase):
    def setUp(self):
        super().setUp()
        self.med = Medication.objects.create(
            pet=self.pet, name="Carprofen", dosage="1 tablet", frequency="DAILY",
            dose_times=["08:00"], start_date=date.today(),
        )

    def test_ac6_medication_reminder_links_to_the_pets_medicine(self):
        res = self.client.post(
            list_url(self.pet.pk), reminder_payload(kind="MEDICATION", title="New box", medication=self.med.pk),
            format="json",
        )

        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["medication"], self.med.pk)
        self.assertEqual(res.json()["medication_name"], "Carprofen")
        self.assertEqual(Reminder.objects.get(pk=res.json()["id"]).medication, self.med)

    def test_ac6_link_is_optional(self):
        res = self.client.post(list_url(self.pet.pk), reminder_payload(kind="MEDICATION"), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertIsNone(res.json()["medication"])
        self.assertIsNone(res.json()["medication_name"])

    def test_ac6_another_pets_medicine_is_refused_like_a_missing_one(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        other_med = Medication.objects.create(
            pet=other_pet, name="Secret", dosage="1", frequency="AS_NEEDED", start_date=date.today()
        )
        for med_id in (other_med.pk, 99999):
            res = self.client.post(
                list_url(self.pet.pk), reminder_payload(kind="MEDICATION", medication=med_id), format="json"
            )
            self.assertEqual(res.status_code, 400)
            self.assertIn("medication", res.json())
        self.assertNotIn("Secret", str(res.json()))

    def test_ac6_only_medication_reminders_can_link_a_medicine(self):
        res = self.client.post(
            list_url(self.pet.pk), reminder_payload(kind="VACCINATION", medication=self.med.pk), format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("medication", res.json())

    def test_ac6_changing_the_type_away_from_medication_needs_the_link_removed(self):
        reminder = self.make_reminder(self.pet, kind="MEDICATION", medication=self.med)
        res = self.client.patch(detail_url(self.pet.pk, reminder.pk), {"kind": "TREATMENT"}, format="json")
        self.assertEqual(res.status_code, 400)

        res = self.client.patch(
            detail_url(self.pet.pk, reminder.pk), {"kind": "TREATMENT", "medication": None}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)

    def test_ac6_deleting_the_medicine_keeps_the_reminder_without_the_link(self):
        reminder = self.make_reminder(self.pet, kind="MEDICATION", medication=self.med)
        self.med.delete()

        reminder.refresh_from_db()
        self.assertIsNone(reminder.medication)

    def test_ac6_next_repeat_keeps_the_link(self):
        reminder = self.make_reminder(
            self.pet, kind="MEDICATION", medication=self.med, repeat="MONTHLY", due_at=in_days(-1)
        )
        res = self.client.post(done_url(self.pet.pk, reminder.pk))
        self.assertEqual(res.json()["next"]["medication_name"], "Carprofen")


ALL_URL = "/api/reminders/"


class US5AllRemindersTests(ReminderApiTestCase):
    def test_ac5_lists_open_reminders_of_all_my_pets_soonest_first(self):
        luna = self.make_pet(self.owner, "Luna")
        later = self.make_reminder(self.pet, title="Later", due_at=in_days(6))
        overdue = self.make_reminder(luna, title="Overdue", due_at=in_days(-1))
        soon = self.make_reminder(luna, title="Soon", due_at=in_days(2))
        self.make_reminder(self.pet, title="Done", due_at=in_days(-3), done_at=timezone.now())
        self.make_reminder(self.make_pet(self.other_owner, "Bella"), title="Not mine")

        res = self.client.get(ALL_URL)

        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["id"] for r in res.json()], [overdue.pk, soon.pk, later.pk])
        self.assertEqual([r["pet_name"] for r in res.json()], ["Luna", "Luna", "Milo"])
        self.assertEqual(res.json()[0]["pet"], luna.pk)

    def test_ac3_due_filter_lists_only_reminders_whose_time_has_come(self):
        overdue = self.make_reminder(self.pet, due_at=in_days(-1))
        self.make_reminder(self.pet, due_at=in_days(1))
        self.make_reminder(self.pet, due_at=in_days(-2), done_at=timezone.now())

        res = self.client.get(ALL_URL, {"due": "1"})

        self.assertEqual([r["id"] for r in res.json()], [overdue.pk])

    def test_list_is_read_only(self):
        self.assertEqual(self.client.post(ALL_URL, reminder_payload(), format="json").status_code, 405)

    def test_vet_gets_403_and_signed_out_user_401(self):
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(ALL_URL).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(ALL_URL).status_code, 401)
