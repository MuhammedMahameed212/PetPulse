import React from "react";
import ThreeLayerShell from "./ThreeLayerShell";

export default function LandingPage({ onGoToAuth }) {
  return (
    <ThreeLayerShell variant="landing">
      <div className="layer-2-glass-stage landing-stage">
        {/* Navigation Bar */}
        <header className="landing-nav">
          <div className="landing-brand">
            <span className="brand-icon">🐾</span>
            <span className="brand-name">PetPulse</span>
            <span className="brand-badge-mini">Smart Pet Care</span>
          </div>

          <nav className="landing-nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#roles" className="nav-link">Portals</a>
            <a
              href="https://www.figma.com/board/uknTrmLpiTSjHbnctsbPa6"
              target="_blank"
              rel="noreferrer"
              className="nav-link highlight"
            >
              Figma Flow ↗
            </a>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => onGoToAuth("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn-primary-sm"
              onClick={() => onGoToAuth("register")}
            >
              Get Started Free →
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="pill-badge-sparkle">
              ✨ Intelligent Pet Health &amp; Veterinary Ecosystem
            </div>
            <h1 className="landing-hero-heading">
              Smart Medical Records, Seamless Vet Care, Happier Pets.
            </h1>
            <p className="landing-hero-subheading">
              Centralize your pet’s digital medical history, vaccinations, medications,
              and AI document extraction in one unified platform — connected directly to your veterinarian.
            </p>

            <div className="landing-cta-row">
              <button
                type="button"
                className="btn-3d btn-hero-primary"
                onClick={() => onGoToAuth("register")}
              >
                Create Free Account →
              </button>
              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => onGoToAuth("login")}
              >
                Sign In to PetPulse
              </button>
            </div>

            <div className="hero-social-proof">
              <div className="proof-avatars">
                <span className="avatar-chip">🐕</span>
                <span className="avatar-chip">🐈</span>
                <span className="avatar-chip">🩺</span>
                <span className="avatar-chip">🦜</span>
              </div>
              <div className="proof-text">
                <strong>Built for Pet Owners &amp; Veterinarians</strong>
                <span>Supporting multi-pet management &amp; collaborative care</span>
              </div>
            </div>
          </div>

          {/* Hero 3D Card Preview */}
          <div className="landing-hero-preview">
            <div className="preview-pet-card-3d">
              <div className="pet-card-header">
                <div className="pet-avatar-circle">🐕</div>
                <div>
                  <h3 className="pet-preview-name">Milo</h3>
                  <div className="pet-preview-meta">Golden Retriever • 2 yrs 4 mos</div>
                </div>
                <span className="status-pill-healthy">🟢 Healthy</span>
              </div>

              <div className="pet-vitals-grid">
                <div className="vital-item">
                  <span className="vital-label">Current Weight</span>
                  <strong className="vital-val">28.4 kg</strong>
                  <span className="vital-trend positive">↑ +0.2 kg</span>
                </div>
                <div className="vital-item">
                  <span className="vital-label">Next Vaccine</span>
                  <strong className="vital-val">Rabies</strong>
                  <span className="vital-trend warning">Due in 14 days</span>
                </div>
                <div className="vital-item">
                  <span className="vital-label">Active Treatment</span>
                  <strong className="vital-val">NexGard</strong>
                  <span className="vital-trend info">Monthly</span>
                </div>
              </div>

              <div className="preview-notification-banner">
                <span className="notif-icon">⏰</span>
                <div className="notif-text">
                  <strong>Upcoming Appointment</strong>
                  <div>Annual Checkup with Dr. Cohen • Tomorrow, 10:30 AM</div>
                </div>
              </div>

              <div className="preview-action-row">
                <button
                  type="button"
                  className="preview-btn-action"
                  onClick={() => onGoToAuth("register")}
                >
                  📋 View Full Health Record →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid (Milestones 1-5 Showcase) */}
        <section id="features" className="landing-features-section">
          <div className="section-header">
            <span className="section-eyebrow">Comprehensive Capabilities</span>
            <h2 className="section-title">Everything Your Pet Needs in One Place</h2>
            <p className="section-subtitle">
              Designed from the ground up to solve fragmented pet records, missed treatments, and clinic communication gaps.
            </p>
          </div>

          <div className="features-grid-3x2">
            <div className="feature-card-3d">
              <div className="feature-card-icon">📋</div>
              <h3>Digital Medical File</h3>
              <p>
                Complete chronological medical history, visit summaries, lab results, and diagnostic notes accessible anytime.
              </p>
              <span className="feature-tag">US-1 • US-2 • US-19</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">💉</div>
              <h3>Vaccines &amp; Periodic Care</h3>
              <p>
                Track rabies, DHPP, worming, and flea treatments with automated countdowns and reminder notifications.
              </p>
              <span className="feature-tag">US-3 • US-18 • US-5</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">🩺</div>
              <h3>Veterinarian Portal</h3>
              <p>
                Dedicated interface for licensed clinics to review medical files, log clinical findings, and issue prescriptions.
              </p>
              <span className="feature-tag">US-10 • US-11 • US-14</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">🤖</div>
              <h3>AI Document Extraction</h3>
              <p>
                Upload vet receipts or test results — AI OCR automatically extracts dates, diagnoses, and medication instructions.
              </p>
              <span className="feature-tag">US-7 • US-8</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">👥</div>
              <h3>Multi-Pet &amp; Co-Owner Sharing</h3>
              <p>
                Manage multiple pets under one account and grant shared access to family members or pet sitters with permissions.
              </p>
              <span className="feature-tag">US-17 • US-21 • US-16</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">🗺️</div>
              <h3>Nearby Clinics &amp; Parks Map</h3>
              <p>
                Find 24/7 emergency veterinary clinics, local practices, and dog parks near your current location.
              </p>
              <span className="feature-tag">US-13</span>
            </div>
          </div>
        </section>

        {/* Two Dedicated Portals Comparison */}
        <section id="roles" className="landing-roles-section">
          <div className="section-header">
            <span className="section-eyebrow">Tailored Experiences</span>
            <h2 className="section-title">Built for Owners &amp; Medical Professionals</h2>
          </div>

          <div className="roles-comparison-grid">
            <div className="role-showcase-card owner-theme">
              <div className="role-badge">🐾 For Pet Owners</div>
              <h3>Total Peace of Mind</h3>
              <ul className="role-bullets">
                <li>✓ Centralized digital timeline for all your pets</li>
                <li>✓ Weight tracking and health symptom diary</li>
                <li>✓ Timely alerts for pills, booster shots, and vet visits</li>
                <li>✓ One-click medical record export (PDF) for boarding &amp; travel</li>
                <li>✓ Direct messaging with your attending vet</li>
              </ul>
              <button
                type="button"
                className="btn-role-action"
                onClick={() => onGoToAuth("register")}
              >
                Register as Pet Owner →
              </button>
            </div>

            <div className="role-showcase-card vet-theme">
              <div className="role-badge">🩺 For Veterinarians &amp; Clinics</div>
              <h3>Streamlined Clinical Workflows</h3>
              <ul className="role-bullets">
                <li>✓ Fast access to verified historical patient records</li>
                <li>✓ Seamless post-treatment summary and digital prescription entry</li>
                <li>✓ Reduced clinic phone inquiries with direct chat</li>
                <li>✓ Clinic profile and license verification</li>
                <li>✓ Collaborative care with pet parents</li>
              </ul>
              <button
                type="button"
                className="btn-role-action"
                onClick={() => onGoToAuth("register")}
              >
                Join as Veterinarian →
              </button>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="landing-bottom-cta">
          <div className="cta-inner-card">
            <h2>Ready to Elevate Your Pet’s Care?</h2>
            <p>
              Join PetPulse today and experience seamless pet health management and veterinary collaboration.
            </p>
            <div className="cta-btn-group">
              <button
                type="button"
                className="btn-3d btn-cta-primary"
                onClick={() => onGoToAuth("register")}
              >
                Create Your Account Now →
              </button>
              <button
                type="button"
                className="btn-cta-secondary"
                onClick={() => onGoToAuth("login")}
              >
                Existing User? Sign In
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-left">
            <span className="brand-logo">🐾 PetPulse</span>
            <span className="footer-sub">Software Engineering Final Project • SCE 2026</span>
          </div>
          <div className="footer-links">
            <button type="button" className="footer-link-btn" onClick={() => onGoToAuth("login")}>
              Sign In
            </button>
            <button type="button" className="footer-link-btn" onClick={() => onGoToAuth("register")}>
              Register
            </button>
            <a
              href="https://www.figma.com/design/NkLufMj4YqGbBicbFeb2VW/PetPulse"
              target="_blank"
              rel="noreferrer"
              className="footer-link-btn"
            >
              Figma Design File
            </a>
          </div>
        </footer>
      </div>
    </ThreeLayerShell>
  );
}
