import re
from datetime import timedelta
from typing import Any, Protocol
from unittest import mock

from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
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


RESET_URL = "/api/auth/password-reset/"
CONFIRM_URL = "/api/auth/password-reset/confirm/"
INVALID_LINK = "This reset link is invalid or has expired."
RESET_SENT = "If an account uses that email, we've sent a reset link."


@override_settings(FRONTEND_URL="http://app.test")
class US22PasswordResetTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counts live in the cache
        self.api_client = TypedAPIClient()
        self.user = User.objects.create_user(
            username="noa", email="noa@example.com", password="OldPassword123!"
        )

    def request_reset(self, email: str) -> APIResponseProtocol:
        return self.api_client.post(RESET_URL, {"email": email}, format="json")

    def test_ac2_ac3_registered_email_gets_one_reset_link(self):
        res = self.request_reset("NOA@Example.com")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {"detail": RESET_SENT})
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["noa@example.com"])
        self.assertRegex(
            mail.outbox[0].body,
            r"http://app\.test/reset-password\?uid=[\w-]+&token=[\w-]+",
        )

    def test_unknown_or_inactive_email_gets_the_same_answer_and_no_email(self):
        User.objects.create_user(
            username="gone", email="gone@example.com", password="OldPassword123!", is_active=False
        )
        for email in ("nobody@example.com", "gone@example.com"):
            with self.subTest(email=email):
                res = self.request_reset(email)
                self.assertEqual(res.status_code, 200)
                self.assertEqual(res.data, {"detail": RESET_SENT})
        self.assertEqual(len(mail.outbox), 0)

    def test_ac6_empty_or_malformed_email_is_rejected(self):
        for email in ("", "not-an-email"):
            with self.subTest(email=email):
                res = self.request_reset(email)
                self.assertEqual(res.status_code, 400)
                self.assertIn("email", res.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_sixth_request_in_an_hour_is_throttled(self):
        for _ in range(5):
            self.assertEqual(self.request_reset("nobody@example.com").status_code, 200)
        res = self.request_reset("nobody@example.com")
        self.assertEqual(res.status_code, 429)
        self.assertIn("Too many", res.data["detail"])

    def reset_link_params(self) -> dict[str, str]:
        self.request_reset(self.user.email)
        match = re.search(r"\?uid=([\w-]+)&token=([\w-]+)", mail.outbox[-1].body)
        assert match, mail.outbox[-1].body
        return {"uid": match[1], "token": match[2]}

    def confirm(self, params: dict[str, str], password="NewPassword456!", confirm=None) -> APIResponseProtocol:
        body = {**params, "new_password": password, "new_password_confirm": confirm or password}
        return self.api_client.post(CONFIRM_URL, body, format="json")

    def login(self, password: str) -> int:
        res = self.api_client.post(
            "/api/auth/login/", {"username": "noa", "password": password}, format="json"
        )
        return res.status_code

    def test_ac3_ac4_ac5_reset_then_sign_in_with_the_new_password(self):
        res = self.confirm(self.reset_link_params())

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {"detail": "Password updated."})
        self.assertEqual(self.login("NewPassword456!"), 200)
        self.assertEqual(self.login("OldPassword123!"), 401)

    def test_ac3_link_works_only_once(self):
        params = self.reset_link_params()
        self.assertEqual(self.confirm(params).status_code, 200)

        res = self.confirm(params, password="OtherPassword789!")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["token"], [INVALID_LINK])
        self.assertEqual(self.login("NewPassword456!"), 200)

    def test_ac3_link_expires_after_one_hour(self):
        params = self.reset_link_params()
        later = default_token_generator._now() + timedelta(hours=1, minutes=1)
        with mock.patch.object(default_token_generator, "_now", return_value=later):
            res = self.confirm(params)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["token"], [INVALID_LINK])

    def test_ac6_altered_link_is_rejected(self):
        params = self.reset_link_params()
        cases = [
            {**params, "token": params["token"] + "x"},
            {**params, "uid": "OTk5"},  # base64 of a user id that doesn't exist
            {**params, "uid": "!!not-base64"},
        ]
        for case in cases:
            with self.subTest(case=case):
                res = self.confirm(case)
                self.assertEqual(res.status_code, 400)
                self.assertEqual(res.data["token"], [INVALID_LINK])
        self.assertEqual(self.login("OldPassword123!"), 200)

    def test_ac6_weak_or_mismatched_password_is_rejected(self):
        params = self.reset_link_params()
        cases = [("123", None, "new_password"), ("noa", None, "new_password"),
                 ("NewPassword456!", "Different456!", "new_password_confirm")]
        for password, confirm, field in cases:
            with self.subTest(password=password):
                res = self.confirm(params, password=password, confirm=confirm)
                self.assertEqual(res.status_code, 400)
                self.assertIn(field, res.data)
        self.assertEqual(self.login("OldPassword123!"), 200)
