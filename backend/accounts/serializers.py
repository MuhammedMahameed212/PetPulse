from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    US-15: Returns authenticated user info and role-based dashboard route.
    """

    dashboard_route = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "license_number",
            "clinic_name",
            "dashboard_route",
        ]
        read_only_fields = ["id", "role", "dashboard_route"]

    def get_dashboard_route(self, obj: User) -> str:
        if obj.role == User.Role.VETERINARIAN:
            return "/vet-dashboard"
        return "/owner-dashboard"


class RegisterSerializer(serializers.ModelSerializer):
    """
    US-15: Validates registration details and creates a new user account.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "license_number",
            "clinic_name",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        if (
            attrs.get("role") == User.Role.VETERINARIAN
            and not attrs.get("license_number")
        ):
            raise serializers.ValidationError(
                {"license_number": "Veterinarians must provide a license number."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
