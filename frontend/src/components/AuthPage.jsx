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
      {/* LAYER 2: Frosted Glass Stage (2-Column on Desktop, Stacked Single-Column on Mobile) */}
      <div className="layer-2-glass-stage auth-split-stage">
        {/* Left / Top Brand Hero Panel */}
        <aside className="layer-2-brand-panel auth-hero-panel">
          <div>
            <div className="brand-pill-3d">🐾 PetPulse</div>
            <h1 className="hero-title">
              Smart Pet Care &amp; Veterinary Collaboration
            </h1>
            <p className="hero-subtitle">
              Centralize your pet’s medical records, vaccinations, medications, and
              veterinary care in one connected platform.
            </p>

            <div className="hero-feature-list">
              <div className="hero-feature-item">
                <span className="feature-icon">📋</span>
                <div>
                  <strong>Digital Medical File</strong>
                  <div className="feature-desc">
                    Complete chronological history for every pet
                  </div>
                </div>
              </div>

              <div className="hero-feature-item">
                <span className="feature-icon">🩺</span>
                <div>
                  <strong>Role-Based Portals</strong>
                  <div className="feature-desc">
                    Tailored views for Pet Owners &amp; Veterinarians
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-footer">US-15 • Registration &amp; Authentication</div>
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
                  <label>Select Account Role</label>
                  <div className="role-selector-grid">
                    <button
                      type="button"
                      className={`role-tile-3d ${
                        formData.role === "PET_OWNER" ? "selected" : ""
                      }`}
                      onClick={() => updateField("role", "PET_OWNER")}
                    >
                      <span className="role-icon">🐾</span>
                      <strong>Pet Owner</strong>
                      <span className="role-sub">בעל חיית מחמד</span>
                    </button>

                    <button
                      type="button"
                      className={`role-tile-3d ${
                        formData.role === "VETERINARIAN" ? "selected" : ""
                      }`}
                      onClick={() => updateField("role", "VETERINARIAN")}
                    >
                      <span className="role-icon">🩺</span>
                      <strong>Veterinarian</strong>
                      <span className="role-sub">וטרינר / צוות מרפאה</span>
                    </button>
                  </div>

                  <div className="row-2">
                    <div>
                      <label>First Name</label>
                      <input
                        className="layer-3-input"
                        value={formData.first_name}
                        onChange={(e) => updateField("first_name", e.target.value)}
                        placeholder="Noa"
                        required
                      />
                    </div>
                    <div>
                      <label>Last Name</label>
                      <input
                        className="layer-3-input"
                        value={formData.last_name}
                        onChange={(e) => updateField("last_name", e.target.value)}
                        placeholder="Cohen"
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
                    placeholder="name@example.com"
                    required
                  />

                  <label>Phone Number</label>
                  <input
                    className="layer-3-input"
                    value={formData.phone_number}
                    onChange={(e) => updateField("phone_number", e.target.value)}
                    placeholder="054-000-0000"
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
                placeholder="Enter your username"
                required
              />

              <label>Password</label>
              <input
                type="password"
                className="layer-3-input"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
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
                    placeholder="••••••••"
                    required
                  />
                </>
              )}

              <button type="submit" className="btn-3d" disabled={loading}>
                {loading
                  ? "Please wait..."
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
