from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


def get_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class RegisterView(generics.CreateAPIView):
    """
    US-15: Create a new account and return JWT tokens + role-based dashboard route.
    """

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
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

        if not user:
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
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
