import React, { useState } from "react";
import { apiFetch, setStoredAuth } from "../api";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ThreeLayerShell, { PulseMark } from "./ThreeLayerShell";

export default function AuthPage({ onAuthSuccess, initialMode = "login", notice = "", onBackToLanding }) {
  const [mode, setMode] = useState(initialMode); // "login" | "register" | "forgot"
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
            <div className="brand-mark"><PulseMark />PetPulse</div>
            <h1 className="hero-title">
              {mode === "register" ? "One file for every pet, shared with your vet." : "Welcome back."}
            </h1>
            <p className="hero-subtitle">
              Vaccines, weights, medication and vet notes, kept up to date by you and
              your clinic.
            </p>

            <div className="hero-feature-list">
              <div className="hero-feature-item">
                <strong>The whole history, in order</strong>
                <div className="feature-desc">Every visit, lab result and dose for each pet.</div>
              </div>

              <div className="hero-feature-item">
                <strong>Built for owners and vets</strong>
                <div className="feature-desc">Each side sees the tools it needs.</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Form Panel containing LAYER 3 Elevated 3D Card */}
        <section className="auth-form-stage">
          <div className="layer-3-card">
            {onBackToLanding && (
              <button
                type="button"
                className="back-to-home-btn"
                onClick={onBackToLanding}
              >
                Back to home
              </button>
            )}
            {mode === "forgot" ? (
              <ForgotPasswordForm
                initialEmail={formData.username.includes("@") ? formData.username : ""}
                onBack={() => setMode("login")}
              />
            ) : (
              <>
                <div className="mode-tabs-3d">
                  <button
                    type="button"
                    className={mode === "login" ? "tab-3d active" : "tab-3d"}
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={mode === "register" ? "tab-3d active" : "tab-3d"}
                    onClick={() => {
                      setMode("register");
                      setError("");
                    }}
                  >
                    Create account
                  </button>
                </div>

                {mode === "login" && notice && !error && (
                  <div className="success-alert-3d" role="status">{notice}</div>
                )}
                {error && <div className="error-alert">{error}</div>}

                <form onSubmit={handleSubmit}>
                  {mode === "register" && (
                    <>
                      <label>I am a</label>
                      <div className="role-selector-grid">
                        <button
                          type="button"
                          className={`role-tile-3d ${
                            formData.role === "PET_OWNER" ? "selected" : ""
                          }`}
                          aria-pressed={formData.role === "PET_OWNER"}
                          onClick={() => updateField("role", "PET_OWNER")}
                        >
                          <strong>Pet owner</strong>
                          <span className="role-sub">בעל חיית מחמד</span>
                        </button>

                        <button
                          type="button"
                          className={`role-tile-3d ${
                            formData.role === "VETERINARIAN" ? "selected" : ""
                          }`}
                          aria-pressed={formData.role === "VETERINARIAN"}
                          onClick={() => updateField("role", "VETERINARIAN")}
                        >
                          <strong>Veterinarian</strong>
                          <span className="role-sub">וטרינר / צוות מרפאה</span>
                        </button>
                      </div>

                      <div className="row-2">
                        <div>
                          <label>First name</label>
                          <input
                            className="layer-3-input"
                            value={formData.first_name}
                            onChange={(e) => updateField("first_name", e.target.value)}
                            placeholder="Noa"
                            required
                          />
                        </div>
                        <div>
                          <label>Last name</label>
                          <input
                            className="layer-3-input"
                            value={formData.last_name}
                            onChange={(e) => updateField("last_name", e.target.value)}
                            placeholder="Cohen"
                            required
                          />
                        </div>
                      </div>

                      <label>Email</label>
                      <input
                        type="email"
                        className="layer-3-input"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="name@example.com"
                        required
                      />

                      <label>Phone (optional)</label>
                      <input
                        className="layer-3-input"
                        value={formData.phone_number}
                        onChange={(e) => updateField("phone_number", e.target.value)}
                        placeholder="054-000-0000"
                      />

                      {formData.role === "VETERINARIAN" && (
                        <div className="row-2">
                          <div>
                            <label>Vet license number</label>
                            <input
                              className="layer-3-input"
                              value={formData.license_number}
                              onChange={(e) => updateField("license_number", e.target.value)}
                              placeholder="VET-IL-8842"
                              required
                            />
                          </div>
                          <div>
                            <label>Clinic name (optional)</label>
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

                  {mode === "login" && (
                    <button
                      type="button"
                      className="back-to-home-btn forgot-link"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                      }}
                    >
                      Forgot password?
                    </button>
                  )}

                  {mode === "register" && (
                    <>
                      <label>Confirm password</label>
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
                      ? mode === "login" ? "Signing in…" : "Creating account…"
                      : mode === "login"
                      ? "Sign in"
                      : "Create account"}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </ThreeLayerShell>
  );
}
