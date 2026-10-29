import React, { useEffect, useState } from "react";

export default function App() {
  const [backendStatus, setBackendStatus] = useState("Checking connection to Django...");
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch("/api/health/")
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message))
      .catch(() =>
        setBackendStatus("Django backend not reachable yet (run `manage.py runserver`).")
      );

    fetch("/api/metrics/")
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch(() => setMetrics(null));
  }, []);

  return (
    <div className="welcome-shell">
      <div className="welcome-card">
        <h1>🐾 PetPulse</h1>
        <p className="subtitle">
          Smart Pet Medical Record &amp; Veterinary Collaboration Platform
        </p>
        <div className="status-box">
          <div>
            <strong>Backend Status:</strong> {backendStatus}
          </div>
          {metrics && (
            <div style={{ marginTop: "0.4rem", fontSize: "0.84rem" }}>
              <strong>Database:</strong> {metrics.database?.vendor} (Connected:{" "}
              {metrics.database?.connected ? "Yes ✅" : "No ❌"} | Applied Migrations:{" "}
              {metrics.database?.applied_migrations})
            </div>
          )}
        </div>
        <p className="next-step">
          Step 0 (Base Skeleton, Database &amp; CI/CD) is ready. Next up:{" "}
          <strong>Milestone 1 — Authentication &amp; Role Routing</strong>.
        </p>
      </div>
    </div>
  );
}
