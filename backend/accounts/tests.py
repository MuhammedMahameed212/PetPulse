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

    def test_us23_logout_endpoint_and_post_logout_protection(self):
        """US-23 (AC5 & AC6): Authenticated user can log out, and unauthenticated access after logout is blocked."""
        user = User.objects.create_user(
            username="logout_user",
            email="logout@example.com",
            password="StrongPassword123!",
        )
        login_res = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "StrongPassword123!"},
            format="json",
        )
        token = login_res.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        logout_res = self.client.post("/api/auth/logout/")
        self.assertEqual(logout_res.status_code, 200)
        self.assertEqual(logout_res.data["detail"], "Logged out successfully.")

        # Clearing credentials simulates client clearing stored tokens on logout (AC6)
        self.client.credentials()
        blocked_res = self.client.get("/api/auth/me/")
        self.assertEqual(blocked_res.status_code, 401)

    def test_us23_change_password_validation_and_login_with_new_password(self):
        """US-23 (AC1–AC4): User can change password, security & confirmation rules are enforced, and new password works on next login."""
        user = User.objects.create_user(
            username="pw_user",
            email="pw@example.com",
            password="InitialPassword123!",
        )
        login_res = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "InitialPassword123!"},
            format="json",
        )
        token = login_res.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 1. Wrong current password -> 400
        wrong_current = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "WrongOldPassword!",
                "new_password": "UpdatedPassword456!",
                "new_password_confirm": "UpdatedPassword456!",
            },
            format="json",
        )
        self.assertEqual(wrong_current.status_code, 400)
        self.assertIn("current_password", wrong_current.data)

        # 2. Weak new password -> 400 (AC3)
        weak_pw = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "InitialPassword123!",
                "new_password": "123",
                "new_password_confirm": "123",
            },
            format="json",
        )
        self.assertEqual(weak_pw.status_code, 400)
        self.assertIn("new_password", weak_pw.data)

        # 3. Valid password change -> 200 (AC1, AC2)
        ok_change = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "InitialPassword123!",
                "new_password": "UpdatedPassword456!",
                "new_password_confirm": "UpdatedPassword456!",
            },
            format="json",
        )
        self.assertEqual(ok_change.status_code, 200)

        # 4. Old password no longer works, new password succeeds on next login (AC4)
        self.client.credentials()
        old_login = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "InitialPassword123!"},
            format="json",
        )
        self.assertEqual(old_login.status_code, 401)

        new_login = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "UpdatedPassword456!"},
            format="json",
        )
        self.assertEqual(new_login.status_code, 200)
