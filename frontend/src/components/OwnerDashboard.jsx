import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import ChangePasswordCard from "./ChangePasswordCard";
import PetForm from "./PetForm";
import PetList from "./PetList";
import PetProfile from "./PetProfile";
import ReminderBell from "./ReminderBell";
import RemindersOverview from "./RemindersOverview";
import ThreeLayerShell, { PulseMark } from "./ThreeLayerShell";
import UserProfileMenu from "./UserProfileMenu";
import useDueAlerts from "../useDueAlerts";

export default function OwnerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("pets"); // "pets" | "reminders" | "settings"
  const [view, setView] = useState("list"); // "list" | "add" | "pet" | "edit"
  const [petId, setPetId] = useState(null);
  const [pets, setPets] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");
  const dueAlerts = useDueAlerts(); // PET-5 (AC3): bell count + browser notifications

  useEffect(() => {
    apiFetch("/pets/")
      .then(setPets)
      .catch((err) => setLoadError(err.message));
  }, []);

  function openTab(tab) {
    setActiveTab(tab);
    setView("list");
  }

  const currentPet = pets?.find((p) => p.id === petId);

  function openPet(id) {
    setActiveTab("pets");
    setPetId(id);
    setView("pet");
  }

  function handleSaved(pet) {
    setPets((prev) => [...prev.filter((p) => p.id !== pet.id), pet].sort((a, b) => a.name.localeCompare(b.name)));
    openPet(pet.id);
  }

  function handleDeleted(id) {
    setPets((prev) => prev.filter((p) => p.id !== id));
    setView("list");
  }

  return (
    <ThreeLayerShell variant="dashboard">
      {/* LAYER 2: Responsive Frosted Glass Stage (Left Sidebar on Desktop, Top Header + Bottom Bar on Mobile) */}
      <div className="layer-2-glass-stage adaptive-dashboard-stage">
        {/* Desktop Sidebar / Mobile Sticky Top Header */}
        <aside className="layer-2-brand-panel adaptive-sidebar">
          <div className="sidebar-top-row">
            <div className="brand-mark"><PulseMark />PetPulse</div>
            <span className="role-badge owner">Pet owner</span>
          </div>

          <nav className="desktop-side-nav">
            <button
              type="button"
              className={`side-nav-item ${activeTab === "pets" ? "active" : ""}`}
              onClick={() => openTab("pets")}
            >
              My pets
            </button>
            <button
              type="button"
              className={`side-nav-item ${activeTab === "reminders" ? "active" : ""}`}
              onClick={() => openTab("reminders")}
            >
              Reminders
            </button>
            <button
              type="button"
              className={`side-nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => openTab("settings")}
            >
              Account settings
            </button>
          </nav>

          <div className="sidebar-footer">
            Signed in as <strong>@{user.username}</strong>
          </div>
        </aside>

        {/* Main Content Area containing Top-Right Profile Dropdown + LAYER 3 Active Tab Card */}
        <section className="adaptive-main-content">
          <div className="workspace-topbar">
            <ReminderBell count={dueAlerts.alerts.length} onOpen={() => openTab("reminders")} />
            <UserProfileMenu user={user} onLogout={onLogout} />
          </div>

          {activeTab === "pets" && view === "pet" && currentPet && (
            <PetProfile
              pet={currentPet}
              onBack={() => setView("list")}
              onEdit={() => setView("edit")}
              onDeleted={handleDeleted}
            />
          )}

          {activeTab === "pets" && view === "edit" && currentPet && (
            <PetForm pet={currentPet} onSaved={handleSaved} onCancel={() => setView("pet")} />
          )}

          {activeTab === "pets" && view === "add" && (
            <PetForm pet={null} onSaved={handleSaved} onCancel={() => setView("list")} />
          )}

          {activeTab === "pets" && view === "list" && (
            <div className="layer-3-card">
              <div className="section-head">
                <div>
                  <h2 className="welcome-heading">Hi, {user.first_name || user.username}.</h2>
                  <p className="welcome-body">Your pets, and everything about their health, in one place.</p>
                </div>
                {pets?.length > 0 && (
                  <button type="button" className="btn-3d btn-inline" onClick={() => setView("add")}>
                    Add a pet
                  </button>
                )}
              </div>
              {loadError && <div className="error-alert" role="alert">Couldn't load your pets: {loadError}</div>}
              {pets === null && !loadError && <p className="welcome-body">Loading your pets…</p>}
              {pets && <PetList pets={pets} onAdd={() => setView("add")} onOpen={openPet} />}
            </div>
          )}

          {activeTab === "reminders" && <RemindersOverview onOpenPet={openPet} notifications={dueAlerts} />}

          {activeTab === "settings" && (
            <>
              <div className="layer-3-card">
                <h2 className="welcome-heading">Your details</h2>
                <div className="user-info-grid">
                  <div className="info-pill">
                    <span className="info-label">Name</span>
                    <strong>
                      {user.first_name} {user.last_name || "—"}
                    </strong>
                  </div>
                  <div className="info-pill">
                    <span className="info-label">Username</span>
                    <strong>@{user.username}</strong>
                  </div>
                  <div className="info-pill">
                    <span className="info-label">Email</span>
                    <strong>{user.email}</strong>
                  </div>
                  <div className="info-pill">
                    <span className="info-label">Phone</span>
                    <strong>{user.phone_number || "Not provided"}</strong>
                  </div>
                </div>
              </div>
              <ChangePasswordCard />
            </>
          )}
        </section>

        {/* Mobile Sticky Bottom Tab Bar (Visible on <768px) */}
        <nav className="mobile-bottom-bar">
          <button
            type="button"
            className={`mobile-tab-item ${activeTab === "pets" ? "active" : ""}`}
            onClick={() => openTab("pets")}
          >
            <span>My pets</span>
          </button>
          <button
            type="button"
            className={`mobile-tab-item ${activeTab === "reminders" ? "active" : ""}`}
            onClick={() => openTab("reminders")}
          >
            <span>Reminders</span>
          </button>
          <button
            type="button"
            className={`mobile-tab-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => openTab("settings")}
          >
            <span>Settings</span>
          </button>
        </nav>
      </div>
    </ThreeLayerShell>
  );
}
