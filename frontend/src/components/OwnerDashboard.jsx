import React from "react";
import ThreeLayerShell from "./ThreeLayerShell";

export default function OwnerDashboard({ user }) {
  return (
    <ThreeLayerShell variant="owner">
      {/* LAYER 2: Frosted Glass Mobile Device Frame */}
      <div className="layer-2-glass-stage owner-mobile-bezel">
        {/* Top Mobile Header Card (Layer 3) */}
        <header className="layer-3-card mobile-top-bar">
          <div>
            <span className="role-badge owner">🐾 Pet Owner App</span>
            <h3 style={{ margin: "0.3rem 0 0" }}>
              Hi, {user.first_name || user.username}!
            </h3>
          </div>
          <div style={{ fontSize: "1.4rem" }}>🔔</div>
        </header>

        {/* Main Elevated 3D Content Card (Layer 3) */}
        <div className="layer-3-card interactive">
          <h4 style={{ marginTop: 0, color: "var(--primary-teal)" }}>
            ✓ Automatic Role Routing Active (US-15)
          </h4>
          <p style={{ fontSize: "0.92rem", lineHeight: 1.5 }}>
            Welcome to your <strong>Pet Owner Mobile Portal</strong> (
            <code>{user.dashboard_route}</code>).
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Email: {user.email} • Username: @{user.username}
          </p>
        </div>

        {/* Sticky 3D Bottom Navigation Dock */}
        <nav className="mobile-bottom-dock">
          <button type="button" className="dock-item active">
            <span>🐶</span>
            <span>My Pets</span>
          </button>
          <button type="button" className="dock-item">
            <span>📋</span>
            <span>Medical</span>
          </button>
          <button type="button" className="dock-item">
            <span>⏰</span>
            <span>Reminders</span>
          </button>
          <button type="button" className="dock-item">
            <span>🗺️</span>
            <span>Map</span>
          </button>
        </nav>
      </div>
    </ThreeLayerShell>
  );
}

