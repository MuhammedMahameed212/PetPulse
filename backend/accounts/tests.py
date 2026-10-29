from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class US15RegistrationAndLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_ac1_and_ac2_register_pet_owner_and_veterinarian(self):
        owner_res = self.client.post(
            "/api/auth/register/",
            {
                "username": "noa_owner",
                "email": "noa@example.com",
                "password": "StrongPassword123!",
                "password_confirm": "StrongPassword123!",
                "first_name": "Noa",
                "last_name": "Cohen",
                "role": "PET_OWNER",
            },
            format="json",
        )
        self.assertEqual(owner_res.status_code, 201)
        self.assertEqual(owner_res.data["user"]["dashboard_route"], "/owner-dashboard")

        vet_res = self.client.post(
            "/api/auth/register/",
            {
                "username": "dr_levi",
                "email": "levi@example.com",
                "password": "StrongPassword123!",
                "password_confirm": "StrongPassword123!",
                "role": "VETERINARIAN",
                "license_number": "VET-IL-8842",
                "clinic_name": "Central Vet Clinic",
            },
            format="json",
        )
        self.assertEqual(vet_res.status_code, 201)
        self.assertEqual(vet_res.data["user"]["dashboard_route"], "/vet-dashboard")

    def test_ac3_ac4_ac5_ac6_login_and_protected_access(self):
        User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="StrongPassword123!",
            role=User.Role.PET_OWNER,
        )
        # Wrong password -> 401
        bad_res = self.client.post(
            "/api/auth/login/",
            {"username": "owner_user", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(bad_res.status_code, 401)

        # Unauthenticated /api/auth/me/ -> 401
        unauth_res = self.client.get("/api/auth/me/")
        self.assertEqual(unauth_res.status_code, 401)

        # Valid login -> 200
        ok_res = self.client.post(
            "/api/auth/login/",
            {"username": "owner_user", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(ok_res.status_code, 200)
        token = ok_res.data["tokens"]["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        me_res = self.client.get("/api/auth/me/")
        self.assertEqual(me_res.status_code, 200)

