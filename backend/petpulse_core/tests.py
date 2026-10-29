from django.test import TestCase


class CoreHealthAndMetricsTests(TestCase):
    def test_health_check_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["project"], "PetPulse")

    def test_system_metrics_endpoint(self):
        response = self.client.get("/api/metrics/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["database"]["connected"])
        self.assertGreater(data["database"]["applied_migrations"], 0)

