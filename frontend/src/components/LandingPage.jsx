import React, { Suspense, lazy, useState } from "react";
import { PulseMark } from "./ThreeLayerShell";
import "./landing.css";

// three.js is ~500 kB; only the landing page pays for it.
// If the chunk fails to download, render nothing instead of crashing the whole page.
const CollarTag3D = lazy(() => import("./CollarTag3D").catch(() => ({ default: () => null })));

const PETS = {
  milo: {
    name: "Milo",
    species: "Dog",
    breed: "Golden retriever",
    age: "2 yrs",
    tagShape: "bone",
    enamel: 0x2c45f5,
    tagLine: "ID PP-4821",
    weight: 28.4,
    weightNote: "+0.2 kg this month",
    weights: [26.8, 27.2, 27.9, 28.2, 28.4],
    vaccine: "Rabies booster",
    vaccineDue: "Due in 14 days",
    urgency: "soon",
    medication: "NexGard Spectra",
    visit: "Annual checkup with Dr. Cohen, tomorrow at 10:30",
    labs: [["ALT", "42 U/L", "ok"], ["Creatinine", "1.1 mg/dL", "ok"], ["Glucose", "96 mg/dL", "ok"]],
  },
  luna: {
    name: "Luna",
    species: "Cat",
    breed: "Siamese",
    age: "1 yr 8 mos",
    tagShape: "round",
    enamel: 0xb4325c,
    tagLine: "ID PP-5170",
    weight: 4.1,
    weightNote: "Stable",
    weights: [3.8, 3.9, 4.0, 4.1, 4.1],
    vaccine: "FVRCP core",
    vaccineDue: "Valid until 2027",
    urgency: "ok",
    medication: "Revolution Plus",
    visit: "Dental cleaning, Dec 4 at 14:00",
    labs: [["ALT", "55 U/L", "ok"], ["Creatinine", "1.9 mg/dL", "ok"], ["T4", "2.8 µg/dL", "ok"]],
  },
  rocky: {
    name: "Rocky",
    species: "Puppy",
    breed: "French bulldog",
    age: "8 mos",
    tagShape: "bone",
    enamel: 0x1e7a55,
    tagLine: "ID PP-6033",
    weight: 11.2,
    weightNote: "+0.8 kg, still growing",
    weights: [7.5, 8.8, 9.6, 10.4, 11.2],
    vaccine: "DHPP dose 3",
    vaccineDue: "Due in 3 days",
    urgency: "due",
    medication: "Heartgard Plus",
    visit: "Puppy vaccination, Thursday at 16:15",
    labs: [["ALT", "38 U/L", "ok"], ["Creatinine", "0.6 mg/dL", "ok"], ["Glucose", "118 mg/dL", "high"]],
  },
};

const ROADMAP = [
  { title: "Accounts and roles", body: "Sign up as a pet owner or a vet, sign in, change your password.", done: true },
  { title: "Pet profiles and medical file", body: "Vaccines, treatments, medication, weight and symptom logs for each pet." },
  { title: "Sharing and export", body: "Give a partner or sitter access, and export a summary for boarding or travel." },
  { title: "Vet collaboration", body: "Vets review the file, add findings, issue prescriptions and answer questions." },
  { title: "Documents, scanning and map", body: "Turn paper reports into records, and find clinics and dog parks nearby." },
];

function Sparkline({ values }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`)
    .join(" ");
  return (
    <svg className="pp-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function LandingPage({ onGoToAuth }) {
  const [petId, setPetId] = useState("milo");
  const [given, setGiven] = useState({});
  const [spread, setSpread] = useState(false);
  const [scan, setScan] = useState("idle"); // idle | scanning | done
  const [audience, setAudience] = useState("owner");
  const pet = PETS[petId];

  function runScan() {
    setScan("scanning");
    setSpread(false);
    setTimeout(() => setScan("done"), 1800);
  }

  const sheets = [
    {
      key: "vax",
      title: "Vaccination certificate",
      lines: [[pet.vaccine, pet.vaccineDue], ["Previous dose", "Nov 2025"], ["Signed", "Dr. Alon Cohen"]],
    },
    { key: "lab", title: "Blood panel", lines: pet.labs.map(([k, v]) => [k, v]) },
    {
      key: "weight",
      title: "Weight log",
      lines: [["Latest", `${pet.weight} kg`], ["Trend", pet.weightNote]],
      spark: true,
    },
    {
      key: "rx",
      title: "Prescription",
      lines: [[pet.medication, "Monthly"], ["Refills", "3 left"], ["Next visit", pet.visit.split(",")[1]?.trim() ?? ""]],
    },
  ];
  if (scan !== "idle") {
    sheets.push({
      key: "scan",
      title: "Paper report, scanned",
      scanned: true,
      lines: [["Vaccine", "Rabies, 3-year"], ["Next booster", "Nov 2029"], ["Clinician", "Dr. Alon Cohen"]],
    });
  }

  return (
    <div className="pp">
      <header className="pp-nav">
        <a className="pp-brand" href="#top" aria-label="PetPulse home">
          <PulseMark />
          PetPulse
        </a>
        <nav className="pp-nav-links" aria-label="Sections">
          <a href="#record">The file</a>
          <a href="#audiences">Owners and vets</a>
          <a href="#roadmap">Roadmap</a>
        </nav>
        <div className="pp-nav-actions">
          <button type="button" className="pp-btn pp-btn-quiet" onClick={() => onGoToAuth("login")}>
            Sign in
          </button>
          <button type="button" className="pp-btn pp-btn-solid" onClick={() => onGoToAuth("register")}>
            Create account
          </button>
        </div>
      </header>

      <main id="top">
        <section className="pp-hero">
          <div className="pp-hero-copy">
            <h1>Their whole health record, behind the tag they already wear.</h1>
            <p className="pp-lede">
              PetPulse keeps vaccines, weights, medication and vet notes in one file that you
              and your vet both keep up to date.
            </p>
            <div className="pp-cta-row">
              <button type="button" className="pp-btn pp-btn-solid pp-btn-lg" onClick={() => onGoToAuth("register")}>
                Create a free account
              </button>
              <button type="button" className="pp-btn pp-btn-line pp-btn-lg" onClick={() => onGoToAuth("login")}>
                Sign in
              </button>
            </div>

            <fieldset className="pp-switch">
              <legend>Try it with a sample pet</legend>
              {Object.entries(PETS).map(([id, p]) => (
                <label key={id} className={petId === id ? "is-on" : ""}>
                  <input type="radio" name="pet" value={id} checked={petId === id} onChange={() => setPetId(id)} />
                  <span className="pp-swatch" style={{ background: `#${p.enamel.toString(16).padStart(6, "0")}` }} />
                  {p.name}
                  <small>{p.species}</small>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="pp-hero-stage">
            <Suspense fallback={<div className="pp-tag-canvas" />}>
              <CollarTag3D pet={pet} />
            </Suspense>
            <p className="pp-hint">Drag the tag to turn it over</p>

            <div className="pp-readout" aria-live="polite">
              <div className="pp-readout-head">
                <strong>{pet.name}</strong>
                <span>
                  {pet.breed}, {pet.age}
                </span>
              </div>
              <dl>
                <div>
                  <dt>Weight</dt>
                  <dd>
                    {pet.weight} kg <Sparkline values={pet.weights} />
                  </dd>
                </div>
                <div>
                  <dt>Next vaccine</dt>
                  <dd>
                    {pet.vaccine}
                    <span className={`pp-due pp-due-${pet.urgency}`}>{pet.vaccineDue}</span>
                  </dd>
                </div>
              </dl>
              <div className="pp-reminder">
                <span>
                  {given[petId] ? `${pet.medication} given today. Next dose in a month.` : `${pet.medication} is due today.`}
                </span>
                {!given[petId] && (
                  <button type="button" className="pp-btn pp-btn-line" onClick={() => setGiven({ ...given, [petId]: true })}>
                    Mark as given
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="record" className="pp-record">
          <div className="pp-record-copy">
            <h2>One file, every visit.</h2>
            <p>
              Certificates, lab results, weigh-ins and prescriptions land in {pet.name}’s file as
              they happen. Got a paper report from the clinic? Scan it, and the dates, doses and
              vet’s name are filled in for you.
            </p>
            <div className="pp-record-actions">
              <button
                type="button"
                className="pp-btn pp-btn-line"
                aria-pressed={spread}
                onClick={() => setSpread(!spread)}
              >
                {spread ? "Stack the file" : "Spread out the file"}
              </button>
              <button
                type="button"
                className="pp-btn pp-btn-solid"
                disabled={scan === "scanning"}
                onClick={scan === "done" ? () => setScan("idle") : runScan}
              >
                {scan === "idle" ? "Scan a paper report" : scan === "scanning" ? "Reading the report…" : "Remove scanned report"}
              </button>
            </div>
            <p className="pp-status" role="status">
              {scan === "done" && "Found 3 details and added them to the file."}
            </p>
          </div>

          <div className={`pp-stack ${spread ? "is-spread" : ""}`}>
            <div className="pp-stack-inner">
              {sheets.map((s, i) => (
                <article
                  key={s.key}
                  className={`pp-sheet ${s.scanned ? "is-scanned" : ""} ${s.scanned && scan === "scanning" ? "is-reading" : ""}`}
                  style={{ "--i": i, "--n": sheets.length }}
                >
                  <header>
                    <h3>{s.title}</h3>
                    <span>{pet.name}</span>
                  </header>
                  <dl>
                    {s.lines.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {s.spark && <Sparkline values={pet.weights} />}
                  {s.scanned && <div className="pp-beam" aria-hidden="true" />}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="audiences" className="pp-audiences">
          <h2>Two sides of the same file.</h2>
          <div className="pp-seg" role="tablist" aria-label="Who it's for">
            <button type="button" role="tab" aria-selected={audience === "owner"} onClick={() => setAudience("owner")}>
              For pet owners
            </button>
            <button type="button" role="tab" aria-selected={audience === "vet"} onClick={() => setAudience("vet")}>
              For vets
            </button>
          </div>
          <div className="pp-aud-body" role="tabpanel" key={audience}>
            {audience === "owner" ? (
              <>
                <ul>
                  <li><strong>All your pets in one place.</strong> Switch between dogs, cats and anyone else with one tap.</li>
                  <li><strong>Reminders that know the schedule.</strong> Vaccines, flea and worm treatments, daily meds.</li>
                  <li><strong>Notes before the visit.</strong> Log symptoms and weight so nothing gets forgotten in the exam room.</li>
                  <li><strong>Share with the people who help.</strong> Give a partner or sitter access, and choose what they can change.</li>
                </ul>
                <button type="button" className="pp-btn pp-btn-solid" onClick={() => onGoToAuth("register")}>
                  Sign up as a pet owner
                </button>
              </>
            ) : (
              <>
                <ul>
                  <li><strong>The full history before they walk in.</strong> Past visits, labs and vaccines, in order.</li>
                  <li><strong>Prescriptions that reach the owner.</strong> Issue and adjust treatment plans straight to their app.</li>
                  <li><strong>Questions without a visit.</strong> Answer non-urgent questions when you have a minute.</li>
                  <li><strong>Be found nearby.</strong> Your clinic shows up on the map for owners in the area.</li>
                </ul>
                <button type="button" className="pp-btn pp-btn-solid" onClick={() => onGoToAuth("register")}>
                  Sign up as a vet
                </button>
              </>
            )}
          </div>
        </section>

        <section id="roadmap" className="pp-roadmap">
          <h2>What’s built, and what’s next.</h2>
          <ol>
            {ROADMAP.map((m, i) => (
              <li key={m.title} className={m.done ? "is-done" : ""}>
                <span className="pp-step">{i + 1}</span>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
                <small>{m.done ? "Available now" : "Planned"}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="pp-closing">
          <h2>Start {pet.name}’s file today.</h2>
          <button type="button" className="pp-btn pp-btn-solid pp-btn-lg" onClick={() => onGoToAuth("register")}>
            Create a free account
          </button>
        </section>
      </main>

      <footer className="pp-footer">
        <span>PetPulse, a software engineering final project, SCE 2026</span>
        <a href="https://www.figma.com/design/NkLufMj4YqGbBicbFeb2VW/PetPulse" target="_blank" rel="noreferrer">
          Figma file
        </a>
        <a href="https://www.figma.com/board/uknTrmLpiTSjHbnctsbPa6" target="_blank" rel="noreferrer">
          Screen flow
        </a>
      </footer>
    </div>
  );
}
