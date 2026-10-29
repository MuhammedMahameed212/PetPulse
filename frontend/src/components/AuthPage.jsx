import React, { useState } from "react";
import { apiFetch, setStoredAuth } from "../api";
import ThreeLayerShell from "./ThreeLayerShell";

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    role: "PET_OWNER",
    phone_number: "",
    license_number: "",
    clinic_name: "",
  });

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const data = await apiFetch("/auth/login/", {
          method: "POST",
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });
        setStoredAuth(data.tokens, data.user);
        onAuthSuccess(data.user);
      } else {
        const data = await apiFetch("/auth/register/", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        setStoredAuth(data.tokens, data.user);
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThreeLayerShell variant="auth">
      {/* LAYER 2: Frosted Glass 2-Column Stage */}
      <div className="layer-2-glass-stage auth-split-stage">
        {/* Left Brand & Value Proposition Glass Panel */}
        <aside className="layer-2-dark-glass auth-hero-panel">
          <div>
            <div className="brand-3d-badge">🐾 PetPulse</div>
            <h1 style={{ fontSize: "1.9rem", margin: "1.25rem 0 0.5rem" }}>
              Every Pet’s Health Story, Connected in One Place.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.94rem", lineHeight: 1.55 }}>
              Manage vaccinations, medications, digital prescriptions, AI medical document
              extraction, and direct veterinary consultations.
            </p>

            <div className="feature-pill-list">
              <div className="feature-pill-3d">
                <span style={{ fontSize: "1.35rem" }}>📋</span>
                <div>
                  <strong>Interactive Digital Medical File</strong>
                  <div style={{ fontSize: "0.8rem", opacity: 0.82 }}>
                    Chronological history of vaccines, treatments &amp; meds
                  </div>
                </div>
              </div>

              <div className="feature-pill-3d">
                <span style={{ fontSize: "1.35rem" }}>🩺</span>
                <div>
                  <strong>Two-Way Vet &amp; Owner Collaboration</strong>
                  <div style={{ fontSize: "0.8rem", opacity: 0.82 }}>
                    Dedicated portals for Pet Owners &amp; Veterinarians
                  </div>
                </div>
              </div>

              <div className="feature-pill-3d">
                <span style={{ fontSize: "1.35rem" }}>✨</span>
                <div>
                  <strong>AI Medical Document Extraction</strong>
                  <div style={{ fontSize: "0.8rem", opacity: 0.82 }}>
                    Smart scanning with owner review &amp; approval
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.78rem", opacity: 0.72 }}>
            PetPulse Platform • Milestone 1 (US-15 Authentication &amp; Role Routing)
          </div>
        </aside>

        {/* Right Form Panel containing LAYER 3 Elevated 3D Card */}
        <section className="auth-form-stage">
          <div className="layer-3-card">
            <div className="mode-tabs-3d">
              <button
                type="button"
                className={mode === "login" ? "tab-3d active" : "tab-3d"}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={mode === "register" ? "tab-3d active" : "tab-3d"}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Create Account
              </button>
            </div>

            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <>
                  <label>Choose Your Role</label>
                  <div className="role-selector-grid">
                    <div
                      className={`role-tile-3d ${
                        formData.role === "PET_OWNER" ? "selected" : ""
                      }`}
                      onClick={() => updateField("role", "PET_OWNER")}
                    >
                      <div style={{ fontSize: "1.35rem" }}>🐾</div>
                      <strong style={{ fontSize: "0.86rem" }}>Pet Owner</strong>
                      <div className="muted" style={{ fontSize: "0.74rem" }}>
                        בעל חיית מחמד
                      </div>
                    </div>

                    <div
                      className={`role-tile-3d ${
                        formData.role === "VETERINARIAN" ? "selected" : ""
                      }`}
                      onClick={() => updateField("role", "VETERINARIAN")}
                    >
                      <div style={{ fontSize: "1.35rem" }}>🩺</div>
                      <strong style={{ fontSize: "0.86rem" }}>Veterinarian</strong>
                      <div className="muted" style={{ fontSize: "0.74rem" }}>
                        רופא וטרינר / מרפאה
                      </div>
                    </div>
                  </div>

                  <div className="row-2">
                    <div>
                      <label>First Name</label>
                      <input
                        className="layer-3-input"
                        value={formData.first_name}
                        onChange={(e) => updateField("first_name", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label>Last Name</label>
                      <input
                        className="layer-3-input"
                        value={formData.last_name}
                        onChange={(e) => updateField("last_name", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <label>Email Address</label>
                  <input
                    type="email"
                    className="layer-3-input"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                  />

                  <label>Phone Number</label>
                  <input
                    className="layer-3-input"
                    value={formData.phone_number}
                    onChange={(e) => updateField("phone_number", e.target.value)}
                  />

                  {formData.role === "VETERINARIAN" && (
                    <div className="row-2">
                      <div>
                        <label>Vet License Number *</label>
                        <input
                          className="layer-3-input"
                          value={formData.license_number}
                          onChange={(e) => updateField("license_number", e.target.value)}
                          placeholder="VET-IL-8842"
                          required
                        />
                      </div>
                      <div>
                        <label>Clinic Name</label>
                        <input
                          className="layer-3-input"
                          value={formData.clinic_name}
                          onChange={(e) => updateField("clinic_name", e.target.value)}
                          placeholder="Central Vet Clinic"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <label>{mode === "login" ? "Username or Email" : "Username"}</label>
              <input
                className="layer-3-input"
                value={formData.username}
                onChange={(e) => updateField("username", e.target.value)}
                required
              />

              <label>Password</label>
              <input
                type="password"
                className="layer-3-input"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
              />

              {mode === "register" && (
                <>
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    className="layer-3-input"
                    value={formData.password_confirm}
                    onChange={(e) => updateField("password_confirm", e.target.value)}
                    required
                  />
                </>
              )}

              <button type="submit" className="btn-3d" disabled={loading}>
                {loading
                  ? "Authenticating..."
                  : mode === "login"
                  ? "Sign In to PetPulse →"
                  : "Create PetPulse Account →"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </ThreeLayerShell>
  );
}

