from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User

from .models import Pet

LIST_URL = "/api/pets/"


def detail_url(pet_id: int) -> str:
    return f"/api/pets/{pet_id}/"


def make_user(username: str, role: str = User.Role.PET_OWNER) -> User:
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="StrongPassword123!", role=role
    )


def pet_payload(**overrides):
    data = {
        "name": "Milo",
        "species": "DOG",
        "breed": "Golden retriever",
        "birth_date": "2024-07-02",
        "birth_date_is_estimate": False,
        "weight_kg": "28.40",
    }
    data.update(overrides)
    return data


class PetApiTestCase(TestCase):
    def setUp(self):
        self.owner = make_user("noa")
        self.other_owner = make_user("dana")
        self.vet = make_user("dr_levi", role=User.Role.VETERINARIAN)
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def create_pet(self, owner: User, **fields) -> Pet:
        data = {**pet_payload(), **fields}
        data["birth_date"] = date.fromisoformat(data["birth_date"])
        return Pet.objects.create(owner=owner, **data)


class US1CreateAndListPetsTests(PetApiTestCase):
    def test_ac1_ac4_owner_creates_pet_and_owner_comes_from_session(self):
        res = self.client.post(LIST_URL, pet_payload(owner=self.other_owner.pk), format="json")

        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(
            set(body),
            {"id", "name", "species", "breed", "birth_date", "birth_date_is_estimate",
             "weight_kg", "photo", "created_at", "updated_at"},
        )
        self.assertEqual(body["name"], "Milo")
        self.assertEqual(body["weight_kg"], "28.40")
        self.assertIsNone(body["photo"])
        self.assertEqual(Pet.objects.get(pk=body["id"]).owner, self.owner)

    def test_ac5_owner_lists_only_own_pets_sorted_by_name(self):
        self.create_pet(self.owner, name="Rocky")
        self.create_pet(self.owner, name="Luna", species="CAT")
        self.create_pet(self.other_owner, name="Bella")

        res = self.client.get(LIST_URL)

        self.assertEqual(res.status_code, 200)
        self.assertEqual([p["name"] for p in res.json()], ["Luna", "Rocky"])

    def test_owner_retrieves_own_pet_but_not_another_owners(self):
        mine = self.create_pet(self.owner)
        theirs = self.create_pet(self.other_owner, name="Bella")

        self.assertEqual(self.client.get(detail_url(mine.pk)).status_code, 200)
        self.assertEqual(self.client.get(detail_url(theirs.pk)).status_code, 404)

    def test_vet_is_forbidden_and_anonymous_is_unauthorized(self):
        pet = self.create_pet(self.owner)
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(LIST_URL).status_code, 403)
        self.assertEqual(self.client.get(detail_url(pet.pk)).status_code, 403)
        self.assertEqual(self.client.post(LIST_URL, pet_payload(), format="json").status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(LIST_URL).status_code, 401)
        self.assertEqual(self.client.get(detail_url(pet.pk)).status_code, 401)

    def test_invalid_fields_are_rejected(self):
        today = date.today()
        cases = {
            "birth_date": [(today + timedelta(days=1)).isoformat(), date(today.year - 51, 1, 1).isoformat()],
            "weight_kg": ["0", "-1", "250"],
            "name": ["", "   ", "x" * 61],
            "species": ["DRAGON"],
        }
        for field, values in cases.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    res = self.client.post(LIST_URL, pet_payload(**{field: value}), format="json")
                    self.assertEqual(res.status_code, 400)
                    self.assertIn(field, res.json())
        self.assertEqual(Pet.objects.count(), 0)

    def test_name_is_trimmed_and_breed_is_optional(self):
        res = self.client.post(LIST_URL, pet_payload(name="  Luna ", breed=""), format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["name"], "Luna")


class US1EditAndDeletePetsTests(PetApiTestCase):
    def test_ac3_patch_updates_only_sent_fields(self):
        pet = self.create_pet(self.owner)

        res = self.client.patch(detail_url(pet.pk), {"weight_kg": "29.10"}, format="json")

        self.assertEqual(res.status_code, 200, res.content)
        pet.refresh_from_db()
        self.assertEqual(str(pet.weight_kg), "29.10")
        self.assertEqual(pet.name, "Milo")

    def test_patch_runs_the_same_validation_as_create(self):
        pet = self.create_pet(self.owner)
        res = self.client.patch(detail_url(pet.pk), {"weight_kg": "0"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("weight_kg", res.json())

    def test_delete_removes_pet(self):
        pet = self.create_pet(self.owner)
        keep = self.create_pet(self.owner, name="Luna")

        self.assertEqual(self.client.delete(detail_url(pet.pk)).status_code, 204)
        self.assertEqual(self.client.get(detail_url(pet.pk)).status_code, 404)
        self.assertTrue(Pet.objects.filter(pk=keep.pk).exists())

    def test_other_owner_cannot_edit_or_delete_and_vet_is_forbidden(self):
        pet = self.create_pet(self.owner)

        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.patch(detail_url(pet.pk), {"name": "Stolen"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(detail_url(pet.pk)).status_code, 404)

        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.patch(detail_url(pet.pk), {"name": "Vet"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(detail_url(pet.pk)).status_code, 403)

        pet.refresh_from_db()
        self.assertEqual(pet.name, "Milo")

    def test_put_is_not_allowed(self):
        pet = self.create_pet(self.owner)
        self.assertEqual(self.client.put(detail_url(pet.pk), pet_payload(), format="json").status_code, 405)
