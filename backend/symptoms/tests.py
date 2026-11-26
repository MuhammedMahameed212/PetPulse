import io
from datetime import date, timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from pets.models import Pet
from PIL import Image

from pets.tests import gps_exif, image_file, make_user

from .media import MAX_VIDEO_BYTES
from .models import SymptomAttachment, SymptomLog


def list_url(pet_id: int) -> str:
    return f"/api/pets/{pet_id}/symptoms/"


def detail_url(pet_id: int, log_id: int) -> str:
    return f"/api/pets/{pet_id}/symptoms/{log_id}/"


def files_url(pet_id: int, log_id: int) -> str:
    return f"/api/pets/{pet_id}/symptoms/{log_id}/attachments/"


def file_url(pet_id: int, log_id: int, attachment_id: int) -> str:
    return f"{files_url(pet_id, log_id)}{attachment_id}/"


MP4_HEAD = b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00"
WEBM_HEAD = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81"


def video_file(head: bytes = MP4_HEAD, name: str = "clip.mp4", size: int = 2048) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, head + b"\x00" * (size - len(head)), content_type="video/mp4")


def symptom_payload(**overrides):
    data = {
        "occurred_at": (timezone.now() - timedelta(hours=2)).isoformat(),
        "description": "Limping on the front left leg",
        "notes": "Started after the park",
        "severity": "MODERATE",
        "status": "ONGOING",
    }
    data.update(overrides)
    return data


class SymptomApiTestCase(TestCase):
    def setUp(self):
        self.owner = make_user("noa")
        self.other_owner = make_user("dana")
        self.vet = make_user("dr_levi", role=User.Role.VETERINARIAN)
        self.pet = self.make_pet(self.owner, "Milo")
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    @staticmethod
    def make_pet(owner: User, name: str) -> Pet:
        return Pet.objects.create(
            owner=owner, name=name, species="DOG", birth_date=date(2024, 7, 2), weight_kg="28.40"
        )

    def make_log(self, pet: Pet, created_by: User | None = None, hours_ago: int = 1, **fields) -> SymptomLog:
        data = {
            "description": "Coughing", "severity": "MILD", "status": "ONGOING",
            "occurred_at": timezone.now() - timedelta(hours=hours_ago), **fields,
        }
        return SymptomLog.objects.create(pet=pet, created_by=created_by or self.owner, **data)


class US6RecordSymptomsTests(SymptomApiTestCase):
    def test_ac1_ac2_owner_adds_record_and_server_sets_pet_and_author(self):
        other_pet = self.make_pet(self.other_owner, "Bella")
        res = self.client.post(
            list_url(self.pet.pk),
            symptom_payload(pet=other_pet.pk, created_by=self.other_owner.pk),
            format="json",
        )

        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["description"], "Limping on the front left leg")
        self.assertEqual(body["severity"], "MODERATE")
        self.assertEqual(body["created_by"], "noa")
        self.assertTrue(body["mine"])
        log = SymptomLog.objects.get(pk=body["id"])
        self.assertEqual(log.pet, self.pet)
        self.assertEqual(log.created_by, self.owner)

    def test_ac2_severity_and_status_default_and_text_is_trimmed(self):
        res = self.client.post(
            list_url(self.pet.pk),
            {"occurred_at": timezone.now().isoformat(), "description": "  Not eating  ", "notes": "  skipped dinner "},
            format="json",
        )

        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual((body["severity"], body["status"]), ("MILD", "ONGOING"))
        self.assertEqual((body["description"], body["notes"]), ("Not eating", "skipped dinner"))

    def test_ac2_validation(self):
        future = (timezone.now() + timedelta(hours=1)).isoformat()
        cases = [
            ({"description": ""}, "description"),
            ({"description": "   "}, "description"),
            ({"description": "x" * 201}, "description"),
            ({"notes": "x" * 2001}, "notes"),
            ({"occurred_at": future}, "occurred_at"),
            ({"occurred_at": None}, "occurred_at"),
            ({"severity": "CRITICAL"}, "severity"),
            ({"status": "MAYBE"}, "status"),
        ]
        for overrides, field in cases:
            with self.subTest(overrides=overrides):
                res = self.client.post(list_url(self.pet.pk), symptom_payload(**overrides), format="json")
                self.assertEqual(res.status_code, 400, res.content)
                self.assertIn(field, res.json())
        self.assertEqual(SymptomLog.objects.count(), 0)

    def test_ac4_history_is_newest_first_and_only_this_pet(self):
        old = self.make_log(self.pet, hours_ago=48, description="Old")
        new = self.make_log(self.pet, hours_ago=1, description="New")
        self.make_log(self.make_pet(self.owner, "Luna"), description="Other pet")

        res = self.client.get(list_url(self.pet.pk))

        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["id"] for r in res.json()], [new.pk, old.pk])

    def test_ac4_history_filters_by_status(self):
        ongoing = self.make_log(self.pet, status="ONGOING")
        resolved = self.make_log(self.pet, status="RESOLVED")

        def ids(query):
            return [r["id"] for r in self.client.get(list_url(self.pet.pk) + query).json()]

        self.assertEqual(ids("?status=ONGOING"), [ongoing.pk])
        self.assertEqual(ids("?status=RESOLVED"), [resolved.pk])
        self.assertEqual(len(ids("?status=nonsense")), 2)  # unknown filter = everything

    def test_ac5_author_edits_and_resolves_record(self):
        log = self.make_log(self.pet)

        res = self.client.patch(
            detail_url(self.pet.pk, log.pk), {"status": "RESOLVED", "notes": "Better today"}, format="json"
        )

        self.assertEqual(res.status_code, 200, res.content)
        log.refresh_from_db()
        self.assertEqual((log.status, log.notes, log.description), ("RESOLVED", "Better today", "Coughing"))

    def test_ac5_author_deletes_record(self):
        log = self.make_log(self.pet)

        self.assertEqual(self.client.delete(detail_url(self.pet.pk, log.pk)).status_code, 204)
        self.assertFalse(SymptomLog.objects.filter(pk=log.pk).exists())

    def test_ac5_only_the_author_can_change_a_record(self):
        # Until PET-21 only the owner reaches the pet, so a record by someone else is set up directly.
        log = self.make_log(self.pet, created_by=self.other_owner)

        body = self.client.get(detail_url(self.pet.pk, log.pk)).json()
        self.assertFalse(body["mine"])
        self.assertEqual(self.client.patch(detail_url(self.pet.pk, log.pk), {"notes": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(detail_url(self.pet.pk, log.pk)).status_code, 403)
        self.assertTrue(SymptomLog.objects.filter(pk=log.pk).exists())

    def test_ac7_records_are_deleted_with_the_pet(self):
        self.make_log(self.pet)
        self.pet.delete()
        self.assertEqual(SymptomLog.objects.count(), 0)


class US6SymptomAccessTests(SymptomApiTestCase):
    def test_other_owners_get_404_vets_403_and_anonymous_401(self):
        log = self.make_log(self.pet)

        my_other_pet = self.make_pet(self.owner, "Luna")
        # a record is only reachable through its own pet
        self.assertEqual(self.client.get(detail_url(my_other_pet.pk, log.pk)).status_code, 404)

        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 404)
        self.assertEqual(self.client.post(list_url(self.pet.pk), symptom_payload(), format="json").status_code, 404)
        self.assertEqual(self.client.patch(detail_url(self.pet.pk, log.pk), {"notes": "x"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(detail_url(self.pet.pk, log.pk)).status_code, 404)

        # AC6 waits for PET-21: until then vets get 403
        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 403)
        self.assertEqual(self.client.post(list_url(self.pet.pk), symptom_payload(), format="json").status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(list_url(self.pet.pk)).status_code, 401)

        log.refresh_from_db()
        self.assertEqual(log.notes, "")


class US6SymptomFileTests(SymptomApiTestCase):
    def setUp(self):
        super().setUp()
        self.log = self.make_log(self.pet)

    def upload(self, file, log=None):
        log = log or self.log
        return self.client.post(files_url(self.pet.pk, log.pk), {"file": file}, format="multipart")

    def test_ac3_photo_is_resized_reencoded_and_stripped_of_exif(self):
        res = self.upload(image_file(size=(3000, 2000), exif=gps_exif()))

        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual((res.json()["kind"], res.json()["content_type"]), ("IMAGE", "image/jpeg"))
        download = self.client.get(file_url(self.pet.pk, self.log.pk, res.json()["id"]))
        self.assertEqual(download["Content-Type"], "image/jpeg")
        self.assertEqual(download["X-Content-Type-Options"], "nosniff")
        img = Image.open(io.BytesIO(download.content))
        self.assertEqual(img.size, (1280, 853))
        self.assertEqual(dict(img.getexif()), {})

    def test_ac3_mp4_mov_and_webm_videos_are_stored_as_uploaded(self):
        cases = [
            (MP4_HEAD, "video/mp4"),
            (b"\x00\x00\x00\x14ftypqt  \x00\x00\x00\x00", "video/quicktime"),
            (WEBM_HEAD, "video/webm"),
        ]
        for head, content_type in cases:
            with self.subTest(content_type=content_type):
                log = self.make_log(self.pet)
                file = video_file(head)
                res = self.upload(file, log)
                self.assertEqual(res.status_code, 201, res.content)
                self.assertEqual((res.json()["kind"], res.json()["content_type"]), ("VIDEO", content_type))
                download = self.client.get(file_url(self.pet.pk, log.pk, res.json()["id"]))
                self.assertEqual(download["Content-Type"], content_type)
                self.assertEqual(download.content, head + b"\x00" * (2048 - len(head)))

    def test_ac3_history_lists_files_without_their_bytes(self):
        self.upload(image_file())
        self.upload(video_file())

        record = self.client.get(list_url(self.pet.pk)).json()[0]

        self.assertEqual([a["kind"] for a in record["attachments"]], ["IMAGE", "VIDEO"])
        self.assertEqual(set(record["attachments"][0]), {"id", "kind", "content_type", "size"})

    def test_ac3_at_most_three_files_and_one_video(self):
        self.assertEqual(self.upload(video_file()).status_code, 201)
        self.assertEqual(self.upload(video_file(WEBM_HEAD, "b.webm")).status_code, 400)  # 2nd video
        self.assertEqual(self.upload(image_file()).status_code, 201)
        self.assertEqual(self.upload(image_file()).status_code, 201)
        res = self.upload(image_file())  # 4th file
        self.assertEqual(res.status_code, 400)
        self.assertIn("file", res.json())
        self.assertEqual(self.log.attachments.count(), 3)

    def test_ac3_bad_and_oversized_files_are_refused(self):
        cases = [
            SimpleUploadedFile("fake.mp4", b"just some text, not a video", content_type="video/mp4"),
            SimpleUploadedFile("photo.heic", b"\x00\x00\x00\x18ftypheic" + b"\x00" * 64, content_type="video/mp4"),
            video_file(size=MAX_VIDEO_BYTES + 1),
            "not a file",
        ]
        for file in cases:
            with self.subTest(file=getattr(file, "name", file)):
                self.assertEqual(self.upload(file).status_code, 400)
        self.assertEqual(SymptomAttachment.objects.count(), 0)

    def test_request_over_the_limit_is_refused_before_reading(self):
        res = self.client.post(
            files_url(self.pet.pk, self.log.pk), {}, format="multipart", CONTENT_LENGTH=str(12 * 1024 * 1024)
        )
        self.assertEqual(res.status_code, 413)

    def test_ac5_author_removes_a_file_and_deleting_the_record_removes_the_rest(self):
        first = self.upload(image_file()).json()["id"]
        self.upload(video_file())

        self.assertEqual(self.client.delete(file_url(self.pet.pk, self.log.pk, first)).status_code, 204)
        self.assertEqual(self.log.attachments.count(), 1)
        self.client.delete(detail_url(self.pet.pk, self.log.pk))
        self.assertEqual(SymptomAttachment.objects.count(), 0)

    def test_ac5_only_the_author_adds_or_removes_files(self):
        log = self.make_log(self.pet, created_by=self.other_owner)
        attachment = SymptomAttachment.objects.create(symptom=log, kind="IMAGE", content_type="image/jpeg", data=b"x", size=1)

        self.assertEqual(self.upload(image_file(), log).status_code, 403)
        self.assertEqual(self.client.delete(file_url(self.pet.pk, log.pk, attachment.pk)).status_code, 403)
        self.assertEqual(self.client.get(file_url(self.pet.pk, log.pk, attachment.pk)).status_code, 200)

    def test_file_access_other_owners_404_vets_403_anonymous_401(self):
        attachment = SymptomAttachment.objects.create(
            symptom=self.log, kind="IMAGE", content_type="image/jpeg", data=b"x", size=1
        )
        other_log = self.make_log(self.pet)
        url = file_url(self.pet.pk, self.log.pk, attachment.pk)
        # a file is only reachable through its own record
        self.assertEqual(self.client.get(file_url(self.pet.pk, other_log.pk, attachment.pk)).status_code, 404)

        self.client.force_authenticate(self.other_owner)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertEqual(self.upload(image_file()).status_code, 404)

        self.client.force_authenticate(self.vet)
        self.assertEqual(self.client.get(url).status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)
        self.assertTrue(SymptomAttachment.objects.filter(pk=attachment.pk).exists())
