import React, { useState } from "react";
import { apiFetch, setStoredAuth } from "../api";

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
    <div className="auth-shell">
      <div className="auth-card">
        <h1>🐾 PetPulse</h1>
        <p className="subtitle">
          {mode === "login"
            ? "Sign in to access your PetPulse portal"
            : "Create your PetPulse account (US-15)"}
        </p>

        <div className="mode-tabs">
          <button
            type="button"
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "register" ? "tab active" : "tab"}
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
              <label>Account Type (Role)</label>
              <select
                value={formData.role}
                onChange={(e) => updateField("role", e.target.value)}
              >
                <option value="PET_OWNER">Pet Owner (בעל חיית מחמד)</option>
                <option value="VETERINARIAN">
                  Veterinarian / Clinic Staff (וטרינר / צוות מרפאה)
                </option>
              </select>

              <div className="row-2">
                <div>
                  <label>First Name</label>
                  <input
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Last Name</label>
                  <input
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />

              <label>Phone Number</label>
              <input
                value={formData.phone_number}
                onChange={(e) => updateField("phone_number", e.target.value)}
              />

              {formData.role === "VETERINARIAN" && (
                <>
                  <label>Veterinary License Number *</label>
                  <input
                    value={formData.license_number}
                    onChange={(e) => updateField("license_number", e.target.value)}
                    placeholder="e.g. VET-IL-8842"
                    required
                  />
                  <label>Clinic Name</label>
                  <input
                    value={formData.clinic_name}
                    onChange={(e) => updateField("clinic_name", e.target.value)}
                    placeholder="e.g. Central Vet Clinic"
                  />
                </>
              )}
            </>
          )}

          <label>{mode === "login" ? "Username or Email" : "Username"}</label>
          <input
            value={formData.username}
            onChange={(e) => updateField("username", e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => updateField("password", e.target.value)}
            required
          />

          {mode === "register" && (
            <>
              <label>Confirm Password</label>
              <input
                type="password"
                value={formData.password_confirm}
                onChange={(e) => updateField("password_confirm", e.target.value)}
                required
              />
            </>
          )}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

