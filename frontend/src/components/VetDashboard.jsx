import React from "react";
import ThreeLayerShell from "./ThreeLayerShell";

export default function VetDashboard({ user }) {
  return (
    <ThreeLayerShell variant="vet">
      {/* LAYER 2: Frosted Glass Wide Clinical Portal Stage */}
      <div className="layer-2-glass-stage vet-portal-stage">
        {/* Left Clinical Sidebar (Dark Teal Glass) */}
        <aside className="layer-2-dark-glass vet-sidebar-3d">
          <div>
            <div className="brand-3d-badge">🩺 PetPulse Vet</div>
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                Dr. {user.first_name} {user.last_name || user.username}
              </div>
              <div style={{ fontSize: "0.82rem", opacity: 0.8, marginTop: "0.2rem" }}>
                License: {user.license_number || "Verified"}
              </div>
              <div style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                {user.clinic_name || "Veterinary Clinic Portal"}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.78rem", opacity: 0.75 }}>
            Clinical Desktop View • {user.dashboard_route}
          </div>
        </aside>

        {/* Right Clinical Workspace Deck containing LAYER 3 Elevated 3D Cards */}
        <section className="vet-workspace-deck">
          <div className="layer-3-card">
            <span className="role-badge vet">Veterinarian Desktop Dashboard</span>
            <h2 style={{ margin: "0.5rem 0 0.25rem" }}>
              Welcome, Dr. {user.last_name || user.username}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Routed automatically to <code>{user.dashboard_route}</code> based on your{" "}
              <strong>VETERINARIAN</strong> role (US-15).
            </p>
          </div>

          <div className="layer-3-card interactive">
            <h3 style={{ marginTop: 0, color: "var(--primary-teal)" }}>
              Patient Medical Records &amp; Prescriptions Workspace
            </h3>
            <p className="muted">
              Authorized pet medical files, visit summaries, and digital prescriptions will
              appear here as we implement the upcoming User Stories.
            </p>
          </div>
        </section>
      </div>
    </ThreeLayerShell>
  );
}

