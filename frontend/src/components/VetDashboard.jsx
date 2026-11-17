import React, { useState } from "react";
import ChangePasswordCard from "./ChangePasswordCard";
import ThreeLayerShell, { PulseMark } from "./ThreeLayerShell";
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
            <div className="brand-mark"><PulseMark />PetPulse for vets</div>
            <span className="role-badge vet">Veterinarian</span>
          </div>

          <nav className="desktop-side-nav">
            <button
              type="button"
              className={`side-nav-item ${activeTab === "home" ? "active" : ""}`}
              onClick={() => setActiveTab("home")}
            >
              Clinic
            </button>
            <button
              type="button"
              className={`side-nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              Account settings
            </button>
          </nav>

          <div className="sidebar-footer">
            Dr. {user.last_name || user.username}, license {user.license_number || "pending"}
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
                Veterinarian (וטרינר)
              </span>
              <h2 className="welcome-heading">
                Hi, Dr. {user.last_name || user.username}.
              </h2>
              <p className="welcome-body">
                Patient files and consultations arrive in a later release. Until then you can
                check your clinic details below, or change your password in Account settings.
              </p>

              <div className="user-info-grid">
                <div className="info-pill">
                  <span className="info-label">Veterinarian</span>
                  <strong>
                    Dr. {user.first_name} {user.last_name || user.username}
                  </strong>
                </div>
                <div className="info-pill">
                  <span className="info-label">License number</span>
                  <strong>{user.license_number || "—"}</strong>
                </div>
                <div className="info-pill">
                  <span className="info-label">Clinic</span>
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
            <span>Clinic</span>
          </button>
          <button
            type="button"
            className={`mobile-tab-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <span>Settings</span>
          </button>
        </nav>
      </div>
    </ThreeLayerShell>
  );
}
