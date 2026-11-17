import base64
from datetime import date, timedelta
from decimal import Decimal

from rest_framework import serializers

from .models import Pet

MAX_AGE = timedelta(days=round(50 * 365.25))


class PetSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            "id", "name", "species", "breed", "birth_date", "birth_date_is_estimate",
            "weight_kg", "photo", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_photo(self, pet: Pet) -> str | None:
        # A data URL, because an <img> tag can't send the Bearer token a photo endpoint would need.
        if not pet.photo:
            return None
        return "data:image/jpeg;base64," + base64.b64encode(bytes(pet.photo)).decode("ascii")

    def validate_birth_date(self, value: date) -> date:
        today = date.today()
        if value > today:
            raise serializers.ValidationError("Birth date can't be in the future.")
        if value < today - MAX_AGE:
            raise serializers.ValidationError("Birth date can't be more than 50 years ago.")
        return value

    def validate_weight_kg(self, value: Decimal) -> Decimal:
        if not Decimal("0") < value <= Decimal("200"):
            raise serializers.ValidationError("Weight must be more than 0 and at most 200 kg.")
        return value
