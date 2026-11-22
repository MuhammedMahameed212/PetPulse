from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import authenticate, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import exceptions, generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)


def get_tokens_for_user(user: User) -> dict[str, str]:
    """Creates a JWT pair for a user: a short-lived access token for API calls and a refresh token."""
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(getattr(refresh, "access_token", "")),
    }


class RegisterView(generics.CreateAPIView):
    """
    US-15: Create a new account and return JWT tokens +
    role-based dashboard route.
    """

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


    def create(self, request, *args, **kwargs):
        """
        Creates the account and answers with the
        user's details and their sign-in tokens.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": get_tokens_for_user(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    US-15: Authenticate user with valid credentials, return error on invalid credentials,
    and provide role-specific dashboard_route on success.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        Signs a user in by username or email (any letter case);
        answers 401 on wrong details,
        otherwise the user's details and tokens.
        """

        username_or_email = request.data.get("username") or request.data.get("email")
        password = request.data.get("password")

        if not username_or_email or not password:
            return Response(
                {"detail": "Please provide both username/email and password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_obj = (
            User.objects.filter(email__iexact=username_or_email).first()
            or User.objects.filter(username__iexact=username_or_email).first()
        )

        user = None
        if user_obj:
            user = authenticate(
                request, username=user_obj.username, password=password
            )

        #the message is the same whether the account doesn;t exist or the password is wrong.
        #so an attacker wouldn't know if the username exists in the database.
        if not isinstance(user, User):
            return Response(
                {"detail": "Invalid login credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": get_tokens_for_user(user),
            },
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    """
    US-15 (Criterion 6): Protected endpoint returning the currently logged-in user.
    Blocks unauthenticated requests with 401 Unauthorized.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Returns the signed-in user;
        the frontend calls it on load to check the saved token.
        """
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)



class LogoutView(APIView):
    """
    US-23 (Criteria 5 & 6): Log out the authenticated user at any time.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Ends the server-side session;
        the frontend also deletes its stored tokens.
        """
        logout(request)
        return Response(
            {"detail": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """
    US-23 (Criteria 1–4): Change password from the user's personal account area.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Validates the request and saves the user's new password."""
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        validated = dict(serializer.validated_data)  # type: ignore[arg-type]
        request.user.set_password(validated["new_password"])
        request.user.save()
        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


def send_password_reset_email(user: User) -> None:
    """US-22 (AC3): email a one-time link; the token dies when the password changes or after 1 hour."""
    query = urlencode({
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "token": default_token_generator.make_token(user),
    })
    link = f"{settings.FRONTEND_URL}/reset-password?{query}"
    send_mail(
        subject="Reset your PetPulse password",
        message=(
            f"Hi {user.username},\n\n"
            f"Use this link to set a new password:\n{link}\n\n"
            "The link works once and expires in 1 hour.\n"
            "If you didn't ask for this, ignore this email; your password stays the same.\n"
        ),
        from_email=None,  # DEFAULT_FROM_EMAIL
        recipient_list=[user.email],
    )


class PasswordResetRequestView(APIView):
    """
    US-22 (AC1–AC3): Send a reset link to the account's email.
    The answer is the same whether or not the email is registered, so it can't be used to find accounts.
    """

    permission_classes = [permissions.AllowAny]

    #rate limiting.
    # in settings "Password_reset" : "5/hour" means at most 5 requests per hour from one IP address.
    #without it an attacker could make the server send thousand of emails(spams).
    #The 6th request gets 429 Too Many Requests.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        """
        Emails a reset link to every active account with that email, 
        then gives the same answer
        whether or not one exists.
        """
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]  # type: ignore[index]
        for user in User.objects.filter(email__iexact=email, is_active=True):
            if user.has_usable_password():
                send_password_reset_email(user)
        return Response({"detail": "If an account uses that email, we've sent a reset link."})

    def throttled(self, request, wait):
        """Replaces DRF's default "request was throttled" text with a friendlier message."""
        raise exceptions.Throttled(wait, detail="Too many reset requests. Try again later.")


class PasswordResetConfirmView(APIView):
    """US-22 (AC3–AC5): set a new password from a valid reset link."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Checks the link and the new password, then saves it."""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."})
