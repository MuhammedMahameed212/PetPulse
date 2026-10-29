import React, { useEffect, useState } from "react";

export default function App() {
  const [backendStatus, setBackendStatus] = useState("Checking connection to Django...");

  useEffect(() => {
    fetch("/api/health/")
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message))
      .catch(() =>
        setBackendStatus("Django backend not reachable yet (run `manage.py runserver`).")
      );
  }, []);

  return (
    <div className="welcome-shell">
      <div className="welcome-card">
        <h1>🐾 PetPulse</h1>
        <p className="subtitle">
          Smart Pet Medical Record &amp; Veterinary Collaboration Platform
        </p>
        <div className="status-box">
          <strong>Backend Status:</strong> {backendStatus}
        </div>
        <p className="next-step">
          Step 0 (Base Skeleton) is ready. Next up: <strong>Milestone 1 — Authentication &amp; Role Routing</strong>.
        </p>
      </div>
    </div>
  );
}
