import React, { useState } from "react";
import { apiFetch } from "../api";

/** US-22 (AC1, AC2, AC6): ask for a password reset link by email. */
export default function ForgotPasswordForm({ initialEmail = "", onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const data = await apiFetch("/auth/password-reset/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(data.detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <h2 className="auth-card-title">Reset your password</h2>

      {sent ? (
        <div className="success-alert-3d" role="status">
          {sent} The link works once and expires in 1 hour.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="auth-card-hint">Enter the email you signed up with and we'll send you a link to set a new password.</p>
          {error && <div className="error-alert" role="alert">{error}</div>}
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            className="layer-3-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
          <button type="submit" className="btn-3d" disabled={sending}>
            {sending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <button type="button" className="back-to-home-btn auth-back-link" onClick={onBack}>
        Back to sign in
      </button>
    </>
  );
}
