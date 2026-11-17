import base64
import io
from datetime import date, timedelta
from decimal import Decimal

from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

from .models import Pet

MAX_AGE = timedelta(days=round(50 * 365.25))
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 40_000_000  # well under Pillow's bomb limit; a 48 MP phone photo fits in 5 MB anyway
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
PHOTO_SIZE = (512, 512)


def process_photo(upload) -> bytes:
    """Validate an uploaded image and re-encode it as a small JPEG with no EXIF (no GPS location)."""
    if not hasattr(upload, "read"):
        raise serializers.ValidationError("Upload a JPEG, PNG or WebP image file.")
    if upload.size > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError("Photo must be 5 MB or smaller.")
    try:
        img = Image.open(upload)
        if img.format not in ALLOWED_FORMATS:
            raise serializers.ValidationError("Upload a JPEG, PNG or WebP image file.")
        if img.width * img.height > MAX_PIXELS:
            raise serializers.ValidationError("Photo is too large. Use one under 40 megapixels.")
        img = ImageOps.exif_transpose(img)  # keep phone photos upright once EXIF is gone
        img.thumbnail(PHOTO_SIZE)
        if img.mode in ("RGBA", "LA", "P"):
            rgba = img.convert("RGBA")
            img = Image.new("RGB", rgba.size, (255, 255, 255))
            img.paste(rgba, mask=rgba.getchannel("A"))
        else:
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, "JPEG", quality=82, optimize=True)
        return out.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise serializers.ValidationError("Upload a JPEG, PNG or WebP image file.") from exc


class PhotoField(serializers.Field):
    """Accepts an uploaded image file; returns the stored JPEG as a data URL.

    A data URL, because an <img> tag can't send the Bearer token a photo endpoint would need.
    """

    def to_internal_value(self, data) -> bytes:
        return process_photo(data)

    def to_representation(self, value) -> str:
        return "data:image/jpeg;base64," + base64.b64encode(bytes(value)).decode("ascii")


class PetSerializer(serializers.ModelSerializer):
    photo = PhotoField(required=False)
    remove_photo = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Pet
        fields = [
            "id", "name", "species", "breed", "birth_date", "birth_date_is_estimate",
            "weight_kg", "photo", "remove_photo", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def save(self, **kwargs):
        if self.validated_data.pop("remove_photo", False):
            kwargs["photo"] = None
        return super().save(**kwargs)

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
