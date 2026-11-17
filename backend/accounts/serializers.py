from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


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


class ChangePasswordSerializer(serializers.Serializer):
    """
    US-23 (Criteria 1–4): Validates current_password, new_password, and new_password_confirm,
    enforces Django password security rules, and prevents reusing the same password.
    """

    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )
    new_password_confirm = serializers.CharField(write_only=True, required=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must be different from your current password."}
            )
        return attrs
