import React, { useEffect, useState } from "react";
import { apiFetch, clearStoredAuth, getStoredToken } from "./api";
import AuthPage from "./components/AuthPage";
import LandingPage from "./components/LandingPage";
import OwnerDashboard from "./components/OwnerDashboard";
import ThreeLayerShell from "./components/ThreeLayerShell";
import VetDashboard from "./components/VetDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [unauthView, setUnauthView] = useState("landing"); // "landing" | "auth"
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    // US-15 AC-6: Verify token with protected /api/auth/me/ endpoint
    apiFetch("/auth/me/")
      .then((userData) => setUser(userData))
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  if (checkingAuth) {
    return (
      <ThreeLayerShell variant="dashboard">
        <div className="layer-2-glass-stage" style={{ padding: "2rem", textAlign: "center" }}>
          <div className="layer-3-card">Verifying session...</div>
        </div>
      </ThreeLayerShell>
    );
  }

  // US-15 AC-6 & US-23 AC-6: Block access to protected dashboards when unauthenticated
  if (!user) {
    if (unauthView === "landing") {
      return (
        <LandingPage
          onGoToAuth={(mode) => {
            setAuthMode(mode || "login");
            setUnauthView("auth");
          }}
        />
      );
    }

    return (
      <AuthPage
        initialMode={authMode}
        onBackToLanding={() => setUnauthView("landing")}
        onAuthSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    );
  }

  // US-15 AC-5: Route to the interface matching the user's role
  if (user.dashboard_route === "/vet-dashboard" || user.role === "VETERINARIAN") {
    return (
      <VetDashboard
        user={user}
        onLogout={() => {
          setUser(null);
          setUnauthView("landing");
        }}
      />
    );
  }

  return (
    <OwnerDashboard
      user={user}
      onLogout={() => {
        setUser(null);
        setUnauthView("landing");
      }}
    />
  );
}
