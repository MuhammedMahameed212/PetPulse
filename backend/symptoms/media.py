"""PET-6 (AC3): checks an uploaded symptom file and decides what it is from its content, never its name."""

from rest_framework import serializers

from pets.serializers import MAX_UPLOAD_BYTES, process_photo

PHOTO_SIZE = (1280, 1280)  # larger than the pet photo, so the vet can see detail
MAX_VIDEO_BYTES = 10 * 1024 * 1024  # 10 MB, roughly 20–30 seconds of phone video

# ISO media files (MP4/MOV) start with a box: 4 bytes of length, then "ftyp", then the brand.
# HEIC/AVIF photos use the same box, so their brands are not accepted as video.
IMAGE_BRANDS = {b"heic", b"heix", b"mif1", b"msf1", b"avif", b"avis"}
WEBM_MAGIC = b"\x1a\x45\xdf\xa3"  # EBML header


def video_type(head: bytes) -> str | None:
    """The video content type for these first bytes, or None when they aren't a video we accept."""
    if head[4:8] == b"ftyp" and head[8:12] not in IMAGE_BRANDS:
        return "video/quicktime" if head[8:12] == b"qt  " else "video/mp4"
    if head.startswith(WEBM_MAGIC):
        return "video/webm"
    return None


def read_attachment(upload) -> tuple[str, str, bytes]:
    """Returns (kind, content_type, data) for an upload; anything not a photo or video is refused."""
    if not hasattr(upload, "read"):
        raise serializers.ValidationError("Upload a photo or a video file.")

    head = upload.read(12)
    upload.seek(0)
    content_type = video_type(head)
    if content_type:
        if upload.size > MAX_VIDEO_BYTES:
            raise serializers.ValidationError("Video must be 10 MB or smaller.")
        return "VIDEO", content_type, upload.read()

    if upload.size > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError("Photo must be 5 MB or smaller.")
    try:
        return "IMAGE", "image/jpeg", process_photo(upload, size=PHOTO_SIZE)
    except serializers.ValidationError as exc:
        raise serializers.ValidationError("Upload a JPEG, PNG or WebP photo, or an MP4, MOV or WebM video.") from exc
