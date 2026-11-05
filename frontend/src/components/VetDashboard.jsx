import React, { useState } from "react";
import ChangePasswordCard from "./ChangePasswordCard";
import ThreeLayerShell from "./ThreeLayerShell";
import UserProfileMenu from "./UserProfileMenu";

export default function VetDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("home"); // "home" | "settings"

  return (
    <ThreeLayerShell variant="dashboard">
      {/* LAYER 2: Responsive Frosted Glass Stage (Left Sidebar on Desktop, Top Header + Bottom Bar on Mobile) */}
      <div className="layer-2-glass-stage adaptive-dashboard-stage">
        {/* Desktop Sidebar / Mobile Sticky Top Header */}
        <aside className="layer-2-brand-panel adaptive-sidebar">
          <div className="sidebar-top-row">
            <div className="brand-pill-3d">🩺 PetPulse Vet</div>
            <span className="role-badge vet">Veterinarian</span>
          </div>

          <nav className="desktop-side-nav">
            <button
              type="button"
              className={`side-nav-item ${activeTab === "home" ? "active" : ""}`}
              onClick={() => setActiveTab("home")}
            >
              🏥 Clinic Overview
            </button>
            <button
              type="button"
              className={`side-nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              ⚙️ Account Settings
            </button>
          </nav>

          <div className="sidebar-footer">
            Dr. {user.last_name || user.username} • {user.license_number || "Verified"}
          </div>
        </aside>

        {/* Main Content Area containing Top-Right Profile Dropdown + LAYER 3 Active Tab Card */}
        <section className="adaptive-main-content">
          <div className="workspace-topbar">
            <UserProfileMenu user={user} onLogout={onLogout} />
          </div>

          {activeTab === "home" ? (
            <div className="layer-3-card interactive">
              <span className="role-badge vet">
                Veterinarian / Clinic Staff Portal (וטרינר)
              </span>
              <h2 className="welcome-heading">
                Welcome, Dr. {user.first_name} {user.last_name || user.username}! 🩺
              </h2>
              <p className="welcome-body">
                You have been authenticated and routed to{" "}
                <code>{user.dashboard_route}</code>.
              </p>

              <div className="user-info-grid">
                <div className="info-pill">
                  <span className="info-label">Veterinarian</span>
                  <strong>
                    Dr. {user.first_name} {user.last_name || user.username}
                  </strong>
                </div>
                <div className="info-pill">
                  <span className="info-label">License Number</span>
                  <strong>{user.license_number || "—"}</strong>
                </div>
                <div className="info-pill">
                  <span className="info-label">Clinic Name</span>
                  <strong>{user.clinic_name || "Not specified"}</strong>
                </div>
                <div className="info-pill">
                  <span className="info-label">Email</span>
                  <strong>{user.email}</strong>
                </div>
              </div>
            </div>
          ) : (
            <ChangePasswordCard />
          )}
        </section>

        {/* Mobile Sticky Bottom Tab Bar (Visible on <768px) */}
        <nav className="mobile-bottom-bar">
          <button
            type="button"
            className={`mobile-tab-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => setActiveTab("home")}
          >
            <span>🏥</span>
            <span>Clinic Home</span>
          </button>
          <button
            type="button"
            className={`mobile-tab-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <span>⚙️</span>
            <span>Account Settings</span>
          </button>
        </nav>
      </div>
    </ThreeLayerShell>
  );
}
