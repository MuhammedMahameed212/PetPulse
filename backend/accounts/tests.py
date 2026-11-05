from typing import Any, Protocol
from django.test import TestCase
from rest_framework.test import APIClient

from .models import User


class APIResponseProtocol(Protocol):
    status_code: int
    data: dict[str, Any]

    def json(self) -> dict[str, Any]: ...


class TypedAPIClient(APIClient):
    """
    Explicitly types APIClient.get/post return values with status_code: int and
    data: dict[str, Any] so static analyzers don't infer WSGIRequest or data=None.
    """

    def get(
        self, path: str, data: Any = None, follow: bool = False, **extra: Any
    ) -> APIResponseProtocol:
        return super().get(path, data=data, follow=follow, **extra)  # type: ignore[return-value]

    def post(
        self,
        path: str,
        data: Any = None,
        format: str | None = None,
        content_type: str | None = None,
        follow: bool = False,
        **extra: Any,
    ) -> APIResponseProtocol:
        return super().post(  # type: ignore[return-value]
            path,
            data=data,
            format=format,
            content_type=content_type,
            follow=follow,
            **extra,
        )


class US15RegistrationAndLoginTests(TestCase):
    def setUp(self):
        self.api_client = TypedAPIClient()

    def test_ac1_and_ac2_register_pet_owner_and_veterinarian(self):
        owner_res = self.api_client.post(
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

        vet_res = self.api_client.post(
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
        bad_res = self.api_client.post(
            "/api/auth/login/",
            {"username": "owner_user", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(bad_res.status_code, 401)

        # Unauthenticated /api/auth/me/ -> 401
        unauth_res = self.api_client.get("/api/auth/me/")
        self.assertEqual(unauth_res.status_code, 401)

        # Valid login -> 200
        ok_res = self.api_client.post(
            "/api/auth/login/",
            {"username": "owner_user", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(ok_res.status_code, 200)
        token = ok_res.data["tokens"]["access"]

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        auth_res = self.api_client.get("/api/auth/me/")
        self.assertEqual(auth_res.status_code, 200)
        self.assertEqual(auth_res.data["username"], "owner_user")

    def test_us23_logout_endpoint_and_post_logout_protection(self):
        """US-23 (AC5 & AC6): Authenticated user can log out, and unauthenticated access after logout is blocked."""
        user = User.objects.create_user(
            username="logout_user",
            email="logout@example.com",
            password="StrongPassword123!",
        )
        login_res = self.api_client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "StrongPassword123!"},
            format="json",
        )
        token = login_res.data["tokens"]["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        logout_res = self.api_client.post("/api/auth/logout/")
        self.assertEqual(logout_res.status_code, 200)
        self.assertEqual(logout_res.data["detail"], "Logged out successfully.")

        # Clearing credentials simulates client clearing stored tokens on logout (AC6)
        self.api_client.credentials()
        blocked_res = self.api_client.get("/api/auth/me/")
        self.assertEqual(blocked_res.status_code, 401)

    def test_us23_change_password_validation_and_login_with_new_password(self):
        """US-23 (AC1–AC4): User can change password, security & confirmation rules are enforced, and new password works on next login."""
        user = User.objects.create_user(
            username="pw_user",
            email="pw@example.com",
            password="InitialPassword123!",
        )
        login_res = self.api_client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "InitialPassword123!"},
            format="json",
        )
        token = login_res.data["tokens"]["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 1. Wrong current password -> 400
        wrong_current = self.api_client.post(
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
        weak_pw = self.api_client.post(
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
        ok_change = self.api_client.post(
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
        self.api_client.credentials()
        old_login = self.api_client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "InitialPassword123!"},
            format="json",
        )
        self.assertEqual(old_login.status_code, 401)

        new_login = self.api_client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "UpdatedPassword456!"},
            format="json",
        )
        self.assertEqual(new_login.status_code, 200)
