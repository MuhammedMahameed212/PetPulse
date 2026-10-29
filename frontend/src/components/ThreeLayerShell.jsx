import React from "react";

/**
 * Global 3-Layer 3D Spatial Layout Wrapper for PetPulse.
 * - Layer 1 (Back / z-index: 0): Scenic background image + floating ambient 3D light orbs
 * - Layer 2 (Middle / z-index: 10): Frosted glassmorphism floating stage
 * - Layer 3 (Front / z-index: 20): Elevated 3D cards & tactile controls rendered inside children
 */
export default function ThreeLayerShell({ variant = "auth", children }) {
  return (
    <div className="scene-3d-viewport">
      {/* LAYER 1: Scenic Background Image & Ambient Depth Orbs */}
      <div className="layer-1-canvas" aria-hidden="true">
        <div className="ambient-orb orb-teal" />
        <div className="ambient-orb orb-coral" />
        <div className="ambient-orb orb-emerald" />
      </div>

      {/* LAYER 2: Frosted Glassmorphism Stage */}
      <main className={`layer-2-stage-wrapper variant-${variant}`}>
        {children}
      </main>
    </div>
  );
}

