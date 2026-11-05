import React, { useState } from "react";
import { apiFetch } from "../api";

/**
 * Layer 3 Elevated 3D Card for Changing Password inside Account Settings (US-23 AC1–AC4).
 */
export default function ChangePasswordCard() {
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await apiFetch("/auth/change-password/", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setFormData({
        current_password: "",
        new_password: "",
        new_password_confirm: "",
      });
      setSuccessMsg(
        "Password updated successfully! Your new password will be used on your next login."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layer-3-card interactive">
      <span className="role-badge owner">Account Security (US-23)</span>
      <h2 className="welcome-heading">Change Password 🔑</h2>
      <p className="welcome-body">
        Enter your current password and choose a strong new password (at least 8
        characters, not purely numeric or common).
      </p>

      {error && <div className="error-alert">{error}</div>}
      {successMsg && <div className="success-alert-3d">{successMsg}</div>}

      <form onSubmit={handleSubmit} style={{ maxWidth: "460px" }}>
        <label>Current Password</label>
        <input
          type="password"
          className="layer-3-input"
          value={formData.current_password}
          onChange={(e) => updateField("current_password", e.target.value)}
          placeholder="Enter current password"
          required
        />

        <label>New Password</label>
        <input
          type="password"
          className="layer-3-input"
          value={formData.new_password}
          onChange={(e) => updateField("new_password", e.target.value)}
          placeholder="Enter new password"
          required
        />

        <label>Confirm New Password</label>
        <input
          type="password"
          className="layer-3-input"
          value={formData.new_password_confirm}
          onChange={(e) => updateField("new_password_confirm", e.target.value)}
          placeholder="Confirm new password"
          required
        />

        <button type="submit" className="btn-3d" disabled={loading}>
          {loading ? "Updating Password..." : "Update Password →"}
        </button>
      </form>
    </div>
  );
}

