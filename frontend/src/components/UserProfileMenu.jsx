import React, { useEffect, useRef, useState } from "react";
import { apiFetch, clearStoredAuth } from "../api";

/**
 * Top-right collapsible 3D User Profile Dropdown Menu with 1-click Logout (US-23).
 */
export default function UserProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogoutClick() {
    try {
      await apiFetch("/auth/logout/", { method: "POST" });
    } catch {
      // Even if token already expired on backend, proceed with client cleanup
    } finally {
      clearStoredAuth();
      setOpen(false);
      onLogout();
    }
  }

  const initials = (
    (user.first_name?.[0] || "") + (user.last_name?.[0] || "") ||
    user.username?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <button
        type="button"
        className="profile-trigger-3d"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="avatar-circle-3d">{initials}</span>
        <span className="profile-trigger-name">
          {user.first_name || user.username}
        </span>
        <span className="profile-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="profile-dropdown-3d">
          <div className="profile-dropdown-header">
            <strong>
              {user.first_name} {user.last_name || user.username}
            </strong>
            <div className="profile-dropdown-email">{user.email}</div>
            <span
              className={`role-badge ${
                user.role === "VETERINARIAN" ? "vet" : "owner"
              }`}
              style={{ marginTop: "0.35rem" }}
            >
              {user.role === "VETERINARIAN" ? "Veterinarian" : "Pet Owner"}
            </span>
          </div>

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="logout-dropdown-btn"
            onClick={handleLogoutClick}
          >
            <span>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

