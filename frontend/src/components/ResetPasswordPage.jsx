import React, { useState } from "react";
import { apiFetch } from "../api";
import ThreeLayerShell, { PulseMark } from "./ThreeLayerShell";

/** US-22 (AC4–AC6): set a new password from the emailed link (/reset-password?uid=…&token=…). */
export default function ResetPasswordPage({ uid, token, onDone, onRequestNewLink, onBackToSignIn }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await apiFetch("/auth/password-reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ uid, token, new_password: password, new_password_confirm: confirm }),
      });
      onDone();
    } catch (err) {
      const fields = err.fields || {};
      const known = fields.token || fields.new_password || fields.new_password_confirm;
      setErrors(known ? fields : { detail: err.message });
      setSaving(false);
    }
  }

  const linkError = errors.token?.[0];
  const fieldError = (name) =>
    errors[name] && <p className="field-error" id={`${name}-error`}>{[].concat(errors[name]).join(" ")}</p>;

  return (
    <ThreeLayerShell variant="auth">
      <div className="layer-2-glass-stage reset-stage">
        <div className="brand-mark reset-brand"><PulseMark />PetPulse</div>
        <h1 className="auth-card-title">Set a new password</h1>

        {linkError ? (
          <>
            <div className="error-alert" role="alert">{linkError}</div>
            <button type="button" className="btn-3d" onClick={onRequestNewLink}>
              Request a new link
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {errors.detail && <div className="error-alert" role="alert">{errors.detail}</div>}

            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              className="layer-3-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-describedby={errors.new_password ? "new_password-error" : undefined}
              required
            />
            {fieldError("new_password")}

            <label htmlFor="new-password-confirm">Confirm new password</label>
            <input
              id="new-password-confirm"
              type="password"
              className="layer-3-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-describedby={errors.new_password_confirm ? "new_password_confirm-error" : undefined}
              required
            />
            {fieldError("new_password_confirm")}

            <button type="submit" className="btn-3d" disabled={saving}>
              {saving ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}

        <button type="button" className="back-to-home-btn auth-back-link" onClick={onBackToSignIn}>
          Back to sign in
        </button>
      </div>
    </ThreeLayerShell>
  );
}
