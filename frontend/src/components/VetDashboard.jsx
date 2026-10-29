import React from "react";

export default function VetDashboard({ user }) {
  return (
    <div className="dashboard-shell vet-wide-shell">
      <header className="dashboard-header">
        <div>
          <span className="role-badge vet">Veterinarian Portal (Desktop View)</span>
          <h2>Welcome, Dr. {user.last_name || user.username}! 🩺</h2>
        </div>
      </header>

      <div className="dashboard-card">
        <h3>Routed to: <code>{user.dashboard_route}</code> (US-15)</h3>
        <p>
          You are logged in as a <strong>Veterinarian / Clinic Staff (וטרינר)</strong>.
        </p>
        <p className="muted">
          License: {user.license_number || "N/A"} | Clinic:{" "}
          {user.clinic_name || "Not specified"} | Email: {user.email}
        </p>
      </div>
    </div>
  );
}

