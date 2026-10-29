import React from "react";

export default function OwnerDashboard({ user }) {
  return (
    <div className="dashboard-shell owner-mobile-shell">
      <header className="dashboard-header">
        <div>
          <span className="role-badge owner">Pet Owner Interface (Mobile View)</span>
          <h2>Welcome, {user.first_name || user.username}! 🐾</h2>
        </div>
      </header>

      <div className="dashboard-card">
        <h3>Routed to: <code>{user.dashboard_route}</code> (US-15)</h3>
        <p>
          You are logged in as a <strong>Pet Owner (בעל חיית מחמד)</strong>.
        </p>
        <p className="muted">
          Account Email: {user.email} | Username: {user.username}
        </p>
      </div>
    </div>
  );
}

