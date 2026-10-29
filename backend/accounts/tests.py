from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class US15RegistrationAndLoginTests(TestCase):
    """
    Automated tests for US-15 (רישום והתחברות למערכת) Acceptance Criteria:
    1. A new user can create an account in the system.
    2. Basic required details are validated during registration.
    3. A user can log in with valid credentials.
    4. An appropriate error message is returned on invalid credentials.
    5. After successful login, the user receives the interface route matching their role.
    6. The system blocks unauthenticated users from protected areas.
    """

    def setUp(self):
        self.client = APIClient()

    def test_ac1_and_ac2_register_pet_owner_and_veterinarian(self):
        """AC1 & AC2: Registering a Pet Owner and a Veterinarian validates required fields and creates accounts."""
        # 1. Register Pet Owner
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
        self.assertEqual(owner_res.data["user"]["role"], "PET_OWNER")
        self.assertEqual(owner_res.data["user"]["dashboard_route"], "/owner-dashboard")
        self.assertIn("access", owner_res.data["tokens"])

        # 2. Veterinarian without license_number should fail validation
        vet_missing_license = self.client.post(
            "/api/auth/register/",
            {
                "username": "dr_levi",
                "email": "levi@example.com",
                "password": "StrongPassword123!",
                "password_confirm": "StrongPassword123!",
                "role": "VETERINARIAN",
            },
            format="json",
        )
        self.assertEqual(vet_missing_license.status_code, 400)
        self.assertIn("license_number", vet_missing_license.data)

        # 3. Veterinarian with license_number succeeds
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
        self.assertEqual(vet_res.data["user"]["role"], "VETERINARIAN")
        self.assertEqual(vet_res.data["user"]["dashboard_route"], "/vet-dashboard")

    def test_ac3_and_ac5_login_success_and_role_routing(self):
        """AC3 & AC5: Valid login succeeds and returns role-specific dashboard_route."""
        User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="StrongPassword123!",
            role=User.Role.PET_OWNER,
        )
        User.objects.create_user(
            username="vet_user",
            email="vet@example.com",
            password="StrongPassword123!",
            role=User.Role.VETERINARIAN,
            license_number="VET-101",
        )

        # Login as Pet Owner (using username)
        res_owner = self.client.post(
            "/api/auth/login/",
            {"username": "owner_user", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(res_owner.status_code, 200)
        self.assertEqual(res_owner.data["user"]["dashboard_route"], "/owner-dashboard")

        # Login as Veterinarian (using email)
        res_vet = self.client.post(
            "/api/auth/login/",
            {"username": "vet@example.com", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(res_vet.status_code, 200)
        self.assertEqual(res_vet.data["user"]["dashboard_route"], "/vet-dashboard")

    def test_ac4_login_with_invalid_credentials_returns_error(self):
        """AC4: Wrong password or non-existent user returns 401 with an error message."""
        User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="StrongPassword123!",
        )
        res = self.client.post(
            "/api/auth/login/",
            {"username": "owner_user", "password": "WrongPassword999!"},
            format="json",
        )
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.data["detail"], "Invalid login credentials.")

    def test_ac6_protected_endpoint_blocks_unauthenticated_users(self):
        """AC6: Unauthenticated requests to protected areas (/api/auth/me/) are blocked with 401."""
        unauth_res = self.client.get("/api/auth/me/")
        self.assertEqual(unauth_res.status_code, 401)

        # Authenticated request with Bearer token succeeds
        user = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="StrongPassword123!",
        )
        login_res = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "StrongPassword123!"},
            format="json",
        )
        token = login_res.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        auth_res = self.client.get("/api/auth/me/")
        self.assertEqual(auth_res.status_code, 200)
        self.assertEqual(auth_res.data["username"], "owner_user")
