import React, { useRef, useState } from "react";
import ThreeLayerShell from "./ThreeLayerShell";

// Mock data for dynamic interactive pet switcher
const PET_PROFILES = {
  milo: {
    name: "Milo",
    breed: "Golden Retriever",
    age: "2 yrs 4 mos",
    avatar: "🐕",
    status: "Excellent",
    statusColor: "#059669",
    weight: "28.4 kg",
    weightDiff: "+0.2 kg this month",
    weightHistory: [26.8, 27.2, 27.9, 28.2, 28.4],
    vaccine: "Rabies Booster",
    vaccineDue: "Due in 14 days",
    vaccineUrgency: "warning",
    medication: "NexGard Spectra",
    medFreq: "Monthly Chewable",
    nextAppointment: "Annual Checkup with Dr. Cohen • Tomorrow, 10:30 AM",
    healthScore: 98,
  },
  luna: {
    name: "Luna",
    breed: "Siamese Cat",
    age: "1 yr 8 mos",
    avatar: "🐈",
    status: "Up to Date",
    statusColor: "#0d9488",
    weight: "4.1 kg",
    weightDiff: "Stable weight",
    weightHistory: [3.8, 3.9, 4.0, 4.1, 4.1],
    vaccine: "FVRCP Core",
    vaccineDue: "Completed (Valid till 2027)",
    vaccineUrgency: "healthy",
    medication: "Revolution Plus",
    medFreq: "Topical Preventive",
    nextAppointment: "Dental Cleaning • Dec 4, 2:00 PM",
    healthScore: 100,
  },
  rocky: {
    name: "Rocky",
    breed: "French Bulldog",
    age: "8 mos (Puppy)",
    avatar: "🐶",
    status: "Vaccine Due",
    statusColor: "#d97706",
    weight: "11.2 kg",
    weightDiff: "+0.8 kg (Growing fast)",
    weightHistory: [7.5, 8.8, 9.6, 10.4, 11.2],
    vaccine: "DHPP Dose 3",
    vaccineDue: "Due in 3 days!",
    vaccineUrgency: "urgent",
    medication: "Heartgard Plus",
    medFreq: "Puppy Protocol",
    nextAppointment: "Puppy Vaccination • Thursday, 4:15 PM",
    healthScore: 92,
  },
};

export default function LandingPage({ onGoToAuth }) {
  const [selectedPet, setSelectedPet] = useState("milo");
  const [activePortalTab, setActivePortalTab] = useState("owner"); // "owner" | "vet"

  // Interactive 3D Card Tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroCardRef = useRef(null);

  // Interactive AI Document Scanner state
  const [scanState, setScanState] = useState("idle"); // "idle" | "scanning" | "completed"
  const [scanProgress, setScanProgress] = useState(0);

  // Interactive Smart Reminder simulation state
  const [reminderDone, setReminderDone] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const currentPet = PET_PROFILES[selectedPet];

  // 3D Card mouse movement handler
  function handleMouseMove(e) {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Rotate max 10 degrees
    setTilt({
      x: -(y / (rect.height / 2)) * 8,
      y: (x / (rect.width / 2)) * 8,
    });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  // Interactive AI Scanner trigger
  function handleTriggerScan() {
    if (scanState === "scanning") return;
    setScanState("scanning");
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanState("completed");
          showToast("✨ AI OCR successfully extracted 5 clinical records!");
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  }

  function handleResetScan() {
    setScanState("idle");
    setScanProgress(0);
  }

  // Toast notification helper
  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  }

  function handleCompleteReminder() {
    setReminderDone(true);
    showToast(`✅ Marked medication administered for ${currentPet.name}! Streak updated.`);
  }

  return (
    <ThreeLayerShell variant="landing">
      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="dynamic-toast-banner animate-slide-down">
          <span>{toastMessage}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToastMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="layer-2-glass-stage landing-stage dynamic-experience">
        {/* Modern Navigation Bar with Live Stats */}
        <header className="landing-nav">
          <div className="landing-brand">
            <span className="brand-icon animated-bounce">🐾</span>
            <span className="brand-name">PetPulse</span>
            <span className="brand-badge-mini pulse-glow">v2.0 Active</span>
          </div>

          <nav className="landing-nav-links">
            <a href="#interactive-demo" className="nav-link">Interactive Demo</a>
            <a href="#ai-scanner" className="nav-link">AI Scanner</a>
            <a href="#portals" className="nav-link">Dual Portals</a>
            <a href="#features" className="nav-link">All Modules</a>
            <a
              href="https://www.figma.com/design/NkLufMj4YqGbBicbFeb2VW/PetPulse"
              target="_blank"
              rel="noreferrer"
              className="nav-link highlight"
            >
              Figma Board ↗
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
              Get Started →
            </button>
          </div>
        </header>

        {/* Live Activity Ticker Bar */}
        <div className="live-activity-ticker" aria-label="Recent platform activity">
          <span className="ticker-label">🟢 LIVE ACTIVITY:</span>
          <div className="ticker-track">
            <span className="ticker-item">🐾 <strong>Milo</strong> received Rabies Booster • Tel Aviv Clinic</span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">🩺 <strong>Dr. Cohen</strong> approved digital prescription for Luna</span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">⚡ AI OCR extracted bloodwork panel in 0.8s</span>
            <span className="ticker-separator">•</span>
            <span className="ticker-item">⚖️ <strong>Rocky</strong> logged new weight: 11.2 kg (+0.8 kg)</span>
          </div>
        </div>

        {/* HERO SECTION with 3D Tilt Card & Interactive Pet Switcher */}
        <section id="interactive-demo" className="landing-hero-grid">
          <div className="landing-hero-text">
            <div className="pill-badge-sparkle">
              ✨ Intelligent Veterinary &amp; Pet Health Ecosystem
            </div>
            <h1 className="landing-hero-heading">
              Smart Pet Care That Moves at the Speed of Life.
            </h1>
            <p className="landing-hero-subheading">
              The connected workspace where pet owners and veterinarians manage complete
              medical histories, automate vaccinations, extract document data with AI, and
              collaborate in real-time.
            </p>

            <div className="landing-cta-row">
              <button
                type="button"
                className="btn-3d btn-hero-primary"
                onClick={() => onGoToAuth("register")}
              >
                Start Free Account →
              </button>
              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => onGoToAuth("login")}
              >
                Sign In to Dashboard
              </button>
            </div>

            {/* Live Interactive Pet Switcher Selector */}
            <div className="interactive-pet-selector-bar">
              <span className="selector-title">Try Live Pet Profile:</span>
              <div className="pet-pill-buttons">
                <button
                  type="button"
                  className={`pet-pill-btn ${selectedPet === "milo" ? "active" : ""}`}
                  onClick={() => setSelectedPet("milo")}
                >
                  🐕 Milo (Dog)
                </button>
                <button
                  type="button"
                  className={`pet-pill-btn ${selectedPet === "luna" ? "active" : ""}`}
                  onClick={() => setSelectedPet("luna")}
                >
                  🐈 Luna (Cat)
                </button>
                <button
                  type="button"
                  className={`pet-pill-btn ${selectedPet === "rocky" ? "active" : ""}`}
                  onClick={() => setSelectedPet("rocky")}
                >
                  🐶 Rocky (Puppy)
                </button>
              </div>
            </div>
          </div>

          {/* 3D TILT INTERACTIVE PET CARD */}
          <div
            className="landing-hero-preview"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={heroCardRef}
              className="preview-pet-card-3d dynamic-tilt-card"
              style={{
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
              }}
            >
              {/* Card Header */}
              <div className="pet-card-header">
                <div className="pet-avatar-circle animate-pulse-avatar">
                  {currentPet.avatar}
                </div>
                <div>
                  <div className="pet-card-title-row">
                    <h3 className="pet-preview-name">{currentPet.name}</h3>
                    <span
                      className="status-pill-healthy"
                      style={{
                        background: `${currentPet.statusColor}18`,
                        color: currentPet.statusColor,
                        borderColor: `${currentPet.statusColor}44`,
                      }}
                    >
                      ● {currentPet.status}
                    </span>
                  </div>
                  <div className="pet-preview-meta">
                    {currentPet.breed} • {currentPet.age}
                  </div>
                </div>
              </div>

              {/* Health Score Metric Gauge */}
              <div className="health-score-widget">
                <div className="score-top">
                  <span>PetPulse Health Score™</span>
                  <strong>{currentPet.healthScore} / 100</strong>
                </div>
                <div className="score-progress-bar">
                  <div
                    className="score-fill"
                    style={{
                      width: `${currentPet.healthScore}%`,
                      background: currentPet.statusColor,
                    }}
                  />
                </div>
              </div>

              {/* Dynamic Vitals Grid */}
              <div className="pet-vitals-grid">
                <div className="vital-item">
                  <span className="vital-label">Weight</span>
                  <strong className="vital-val">{currentPet.weight}</strong>
                  <span className="vital-trend positive">{currentPet.weightDiff}</span>
                  {/* Dynamic Weight Mini Chart Bars */}
                  <div className="mini-chart-bars">
                    {currentPet.weightHistory.map((val, idx) => (
                      <div
                        key={idx}
                        className="chart-bar"
                        style={{ height: `${(val / 30) * 26}px` }}
                        title={`${val} kg`}
                      />
                    ))}
                  </div>
                </div>

                <div className="vital-item">
                  <span className="vital-label">Next Vaccine</span>
                  <strong className="vital-val">{currentPet.vaccine}</strong>
                  <span className={`vital-trend ${currentPet.vaccineUrgency}`}>
                    {currentPet.vaccineDue}
                  </span>
                </div>

                <div className="vital-item">
                  <span className="vital-label">Active Treatment</span>
                  <strong className="vital-val">{currentPet.medication}</strong>
                  <span className="vital-trend info">{currentPet.medFreq}</span>
                </div>
              </div>

              {/* Interactive Smart Reminder Banner */}
              <div className="preview-notification-banner">
                <span className="notif-icon">⏰</span>
                <div className="notif-text">
                  <strong>Smart Reminder</strong>
                  <div>
                    {reminderDone
                      ? `All caught up! Next dose scheduled for next month.`
                      : `Give ${currentPet.name} their ${currentPet.medication} dose`}
                  </div>
                </div>
                {!reminderDone ? (
                  <button
                    type="button"
                    className="notif-action-btn"
                    onClick={handleCompleteReminder}
                  >
                    Mark Given ✓
                  </button>
                ) : (
                  <span className="notif-completed-tag">✓ Done</span>
                )}
              </div>

              <div className="preview-action-row">
                <button
                  type="button"
                  className="preview-btn-action"
                  onClick={() => onGoToAuth("register")}
                >
                  Manage {currentPet.name}’s Medical File in PetPulse →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE AI DOCUMENT EXTRACTION SANDBOX (US-7, US-8) */}
        <section id="ai-scanner" className="landing-scanner-sandbox">
          <div className="scanner-banner-card">
            <div className="scanner-text-col">
              <span className="section-eyebrow">Milestone 5 Feature Spotlight</span>
              <h2 className="scanner-title">🤖 Experience AI Medical Document OCR</h2>
              <p className="scanner-desc">
                Pet owners receive invoices, diagnostic labs, and vaccine certificates on paper.
                PetPulse extracts diagnoses, dates, and dosages in seconds and automatically links them to the pet's timeline.
              </p>

              <div className="scanner-controls-row">
                {scanState === "idle" && (
                  <button
                    type="button"
                    className="btn-3d btn-scan-trigger"
                    onClick={handleTriggerScan}
                  >
                    ⚡ Test Live AI Scanner Demo →
                  </button>
                )}
                {scanState === "scanning" && (
                  <div className="scanning-status-chip">
                    <span className="spinner-icon">🔄</span> Analyzing clinical document ({scanProgress}%)...
                  </div>
                )}
                {scanState === "completed" && (
                  <button
                    type="button"
                    className="btn-ghost-sm btn-rescan"
                    onClick={handleResetScan}
                  >
                    ↺ Reset Scanner Demo
                  </button>
                )}
              </div>
            </div>

            {/* Scanner Visual Simulation Card */}
            <div className="scanner-viewport-box">
              <div className={`mock-document-sheet ${scanState === "scanning" ? "scanning" : ""}`}>
                <div className="doc-watermark">VETERINARY CLINIC MEDICAL REPORT</div>
                <div className="doc-header-line">
                  <span>Patient: <strong>{currentPet.name} ({currentPet.breed})</strong></span>
                  <span>Date: <strong>12-Nov-2026</strong></span>
                </div>
                <div className="doc-body-skeleton">
                  <div className="skeleton-line" style={{ width: "90%" }} />
                  <div className="skeleton-line" style={{ width: "75%" }} />
                  <div className="skeleton-line" style={{ width: "85%" }} />
                </div>

                {/* Animated Laser Scan Line */}
                {scanState === "scanning" && <div className="laser-scan-line" />}

                {/* Extracted Data Overlay Badges */}
                {scanState === "completed" && (
                  <div className="extracted-fields-overlay animate-pop-in">
                    <span className="extract-chip green">✓ Detected: Rabies 3-Yr Booster</span>
                    <span className="extract-chip blue">✓ Next Booster: Nov 2029</span>
                    <span className="extract-chip purple">✓ Clinician: Dr. Alon Cohen</span>
                    <span className="extract-chip amber">✓ Synced to Timeline</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* DUAL-PORTAL INTERACTIVE PERSPECTIVE (US-15, US-23) */}
        <section id="portals" className="landing-portals-section">
          <div className="section-header">
            <span className="section-eyebrow">Two Seamless Experiences</span>
            <h2 className="section-title">Designed for Both Sides of Pet Healthcare</h2>
            <p className="section-subtitle">
              PetPulse provides purpose-built workflows for pet parents and licensed medical professionals.
            </p>
          </div>

          <div className="portal-toggle-buttons">
            <button
              type="button"
              className={`portal-tab-btn ${activePortalTab === "owner" ? "active" : ""}`}
              onClick={() => setActivePortalTab("owner")}
            >
              🐾 Pet Owner Portal View
            </button>
            <button
              type="button"
              className={`portal-tab-btn ${activePortalTab === "vet" ? "active" : ""}`}
              onClick={() => setActivePortalTab("vet")}
            >
              🩺 Veterinarian &amp; Clinic View
            </button>
          </div>

          <div className="portal-dynamic-display-card">
            {activePortalTab === "owner" ? (
              <div className="portal-tab-content animate-fade-in">
                <div className="portal-details-col">
                  <span className="badge-owner-chip">For Loving Pet Parents</span>
                  <h3>Never Miss a Beat in Your Pet’s Life</h3>
                  <ul className="portal-feature-list">
                    <li>✓ <strong>Multi-Pet Management:</strong> Switch between all your dogs, cats, and birds with one tap.</li>
                    <li>✓ <strong>Weight &amp; Symptom Tracker:</strong> Log symptoms before vet visits to spot early warning signs.</li>
                    <li>✓ <strong>Shared Pet Access:</strong> Grant co-owner or pet-sitter access with full permission controls.</li>
                    <li>✓ <strong>Instant Summary Export:</strong> Generate a verified medical PDF for boarding facilities and travel.</li>
                  </ul>
                  <button
                    type="button"
                    className="btn-3d btn-portal-cta"
                    onClick={() => onGoToAuth("register")}
                  >
                    Join as Pet Owner →
                  </button>
                </div>
                <div className="portal-visual-col">
                  <div className="portal-mockup-frame">
                    <div className="mock-window-header">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                      <span className="window-title">Owner Dashboard • PetPulse</span>
                    </div>
                    <div className="mock-window-body">
                      <div className="mock-stat-tile">
                        <span>🐾 Active Pets</span>
                        <strong>3 Pets Registered</strong>
                      </div>
                      <div className="mock-stat-tile">
                        <span>⏰ Next Reminder</span>
                        <strong>Tomorrow: Milo Heartgard</strong>
                      </div>
                      <div className="mock-stat-tile">
                        <span>📄 Documents</span>
                        <strong>14 Lab Reports Archived</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="portal-tab-content animate-fade-in">
                <div className="portal-details-col">
                  <span className="badge-vet-chip">For Licensed Practitioners</span>
                  <h3>Modernize Your Veterinary Practice</h3>
                  <ul className="portal-feature-list">
                    <li>✓ <strong>Verified Patient Timeline:</strong> Access complete historical records without relying on memory.</li>
                    <li>✓ <strong>Digital Prescriptions:</strong> Issue and update treatment plans directly to the owner’s app.</li>
                    <li>✓ <strong>Asynchronous Consultations:</strong> Review non-urgent inquiries and triage patients efficiently.</li>
                    <li>✓ <strong>Clinic Profile &amp; Map Listing:</strong> Get discovered by local pet owners looking for care.</li>
                  </ul>
                  <button
                    type="button"
                    className="btn-3d btn-portal-cta"
                    onClick={() => onGoToAuth("register")}
                  >
                    Register Veterinary Clinic →
                  </button>
                </div>
                <div className="portal-visual-col">
                  <div className="portal-mockup-frame vet-frame">
                    <div className="mock-window-header">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                      <span className="window-title">Clinic Station • Dr. Alon Cohen (VET-8842)</span>
                    </div>
                    <div className="mock-window-body">
                      <div className="mock-stat-tile">
                        <span>🩺 Patients Today</span>
                        <strong>8 Appointments Scheduled</strong>
                      </div>
                      <div className="mock-stat-tile">
                        <span>💊 Prescriptions</span>
                        <strong>3 Pending Renewal Approvals</strong>
                      </div>
                      <div className="mock-stat-tile">
                        <span>💬 Client Messages</span>
                        <strong>2 New Patient Questions</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 6 CORE CAPABILITIES SHOWCASE */}
        <section id="features" className="landing-features-section">
          <div className="section-header">
            <span className="section-eyebrow">Comprehensive System</span>
            <h2 className="section-title">Everything Built into PetPulse</h2>
            <p className="section-subtitle">
              Engineered for the Software Engineering Final Project across 5 complete Milestones.
            </p>
          </div>

          <div className="features-grid-3x2">
            <div className="feature-card-3d">
              <div className="feature-card-icon">📋</div>
              <h3>Digital Medical File</h3>
              <p>
                Complete chronological medical history, visit summaries, lab results, and diagnostic notes accessible anytime.
              </p>
              <span className="feature-tag">Milestone 2 • US-1, 2, 19</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">💉</div>
              <h3>Vaccines &amp; Periodic Care</h3>
              <p>
                Track rabies, DHPP, worming, and flea treatments with automated countdowns and reminder notifications.
              </p>
              <span className="feature-tag">Milestone 2 • US-3, 18, 5</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">🩺</div>
              <h3>Veterinarian Portal</h3>
              <p>
                Dedicated interface for licensed clinics to review medical files, log clinical findings, and issue prescriptions.
              </p>
              <span className="feature-tag">Milestone 4 • US-10, 11, 14</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">🤖</div>
              <h3>AI Document Extraction</h3>
              <p>
                Upload vet receipts or test results — AI OCR automatically extracts dates, diagnoses, and medication instructions.
              </p>
              <span className="feature-tag">Milestone 5 • US-7, 8</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">👥</div>
              <h3>Multi-Pet &amp; Co-Owner Sharing</h3>
              <p>
                Manage multiple pets under one account and grant shared access to family members or pet sitters with permissions.
              </p>
              <span className="feature-tag">Milestone 3 • US-17, 21, 16</span>
            </div>

            <div className="feature-card-3d">
              <div className="feature-card-icon">🗺️</div>
              <h3>Nearby Clinics &amp; Parks Map</h3>
              <p>
                Find 24/7 emergency veterinary clinics, local practices, and dog parks near your current location.
              </p>
              <span className="feature-tag">Milestone 5 • US-13</span>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
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
                Create Free Account Now →
              </button>
              <button
                type="button"
                className="btn-cta-secondary"
                onClick={() => onGoToAuth("login")}
              >
                Sign In to Existing Account
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
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
              Figma Design Canvas
            </a>
            <a
              href="https://www.figma.com/board/uknTrmLpiTSjHbnctsbPa6"
              target="_blank"
              rel="noreferrer"
              className="footer-link-btn"
            >
              FigJam Screens Flow
            </a>
          </div>
        </footer>
      </div>
    </ThreeLayerShell>
  );
}
