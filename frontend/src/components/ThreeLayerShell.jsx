import React from "react";

export function PulseMark() {
  return (
    <svg viewBox="0 0 40 20" width="30" height="15" aria-hidden="true">
      <path d="M1 11h9l3-8 5 15 4-11 2 4h15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Page frame shared by the auth page and dashboards: a centred sheet on exam-paper background. */
export default function ThreeLayerShell({ variant = "auth", children }) {
  return (
    <div className={`scene-3d-viewport scene-${variant}`}>
      <main className={`layer-2-stage-wrapper variant-${variant}`}>{children}</main>
    </div>
  );
}
