import React, { useEffect, useState } from "react";
import { apiFetch, clearStoredAuth, getStoredToken } from "./api";
import AuthPage from "./components/AuthPage";
import OwnerDashboard from "./components/OwnerDashboard";
import ThreeLayerShell from "./components/ThreeLayerShell";
import VetDashboard from "./components/VetDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

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
      <ThreeLayerShell variant="owner">
        <div className="layer-2-glass-stage" style={{ padding: "2rem", textAlign: "center" }}>
          <div className="layer-3-card">Verifying session...</div>
        </div>
      </ThreeLayerShell>
    );
  }

  // US-15 AC-6: Block access to protected dashboards when unauthenticated
  if (!user) {
    return <AuthPage onAuthSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  // US-15 AC-5: Route to the interface matching the user's role
  if (user.dashboard_route === "/vet-dashboard" || user.role === "VETERINARIAN") {
    return <VetDashboard user={user} />;
  }

  return <OwnerDashboard user={user} />;
}
