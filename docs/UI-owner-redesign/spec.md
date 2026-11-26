# Spec: Owner Dashboard and Pet Page Refresh — V1

Status: approved direction (2026-11-26) — "useful refresh"
Jira: none (UI polish, not one of US-1..US-23). Commits: `UI: …`
Supports: NFR03 (usability: key actions in few steps), NFR05 (responsive, owner UI mobile-first), NFR07 (accessibility).

## Problem

- **Dashboard ("My pets")**: a greeting and small pet cards in a mostly empty sheet. Nothing says what needs attention today, though the app knows (overdue reminders, doses due). Cards show only name, species and age.
- **Pet page**: one long sheet where facts, Medications, Symptoms, Reminders and three dashed "coming later" boxes all have the same weight; the placeholders take more room than the real records.
- **Motion**: cards don't react to a press.

## Objective

Keep the identity (sage / pine / cobalt tokens, Fraunces + Instrument Sans) and make both screens more alive and more useful: the dashboard answers "what needs me today?", and the pet page reads as a pet's file with clear sections.

## Dashboard

1. **Greeting by time of day**: "Good morning / afternoon / evening, Noa."
2. **Today strip** (`TodaySummary`), three tiles:
   - **Doses due**: count of medicine doses due now (from the bell's data). Opens the Reminders tab.
   - **Overdue**: count of overdue reminders. Opens the Reminders tab.
   - **Next up**: the soonest upcoming reminder: title, pet, when ("tomorrow", "in 4 days"). Opens that pet.
   - When nothing is due: the first two tiles read "All clear" in the calm green.
3. **Richer pet cards**: a species-coloured band, larger avatar, name, "Labrador · 4 yrs", and one status line:
   - "1 overdue" (red, with a dot and text, not colour alone), else
   - "Next: Flea drops · in 12 days", else
   - "Nothing scheduled".

## Pet page

4. **Hero header**: species-tinted panel with the large avatar, name, and one fact line "Labrador · 4 yrs · 28.4 kg · born 02/03/2022" (approximate births say "about"). Edit and Delete stay, as smaller buttons.
5. **Jump links** under the hero: Medications · Symptoms · Reminders, linking to each section (smooth scroll unless the user prefers reduced motion; headings get `scroll-margin-top`).
6. **Sections as cards**: each of Medications, Symptoms, Reminders sits on its own sheet-coloured card with padding, instead of plain blocks on white.
7. **Coming soon** becomes one quiet line: "Coming soon: medical file, treatments, documents."

## Motion (per the design-engineering rules)

- Press feedback: pet cards, Today tiles and pill buttons scale to 0.97 on `:active` (160 ms, strong ease-out).
- Hover: cards lift 2 px with a soft shadow, only on devices with a real pointer (`@media (hover: hover) and (pointer: fine)`).
- ~~No entrance animations~~ — revised in V1.1 below at the user's request ("still very dull").
- Only `transform`, `box-shadow`, `border-color`, `background-color` transition, never `all`. Reduced motion: the existing global rule already shortens every transition.

## Motion V1.1 (2026-11-26)

Every motion is short, runs once when something mounts or changes, and moves only `transform`/`opacity`.

| Motion | Purpose | Ingredients |
| --- | --- | --- |
| View card rises 8 px + fades in on switch | Prevent a jarring change | keyframes `rise-in` 240 ms `--ease-out` |
| Today tiles then pet cards, one after another | Show the order: today first, then pets | 280 ms, 40 ms stagger via `--i`, capped at 8 |
| Pet page: avatar settles (`scale(0.92)`→1), jump bar and sections follow | Prevent a jarring change | 280–320 ms, 40 ms steps |
| Overdue dot sends out a ring twice, then stops | Point at what needs attention | `ring-out` 900 ms ×2, after the card lands |
| Bell count pops when the number changes | State indication | keyed span, `pop-in` 220 ms |
| Section reached by a jump link flashes a cobalt ring | Spatial: where you landed | `:has(:target)`, holds then fades, 1.6 s, opacity only |
| Avatar scales 1.05 on card hover | Feedback | pointer devices only |

Not animated: count-up numbers (data you read), anything on keyboard actions. Reduced motion: entrances become a 200 ms fade; rings and pops are off.

## 3D V1.2 (2026-11-26)

- **Pet page: the pet's own 3D collar tag** in the hero, reusing the landing page's three.js `CollarTag3D` (lazy-loaded, so three.js only downloads when a pet page opens; without WebGL it renders nothing). `petTag(pet)` maps a real pet to it: bone for dogs, round for others, enamel in the species colour, engraved name + `ID PP-0007`. Drag or arrow keys flip it to the scan-code side. The tag object is memoized so it doesn't spin on every re-render.
- **Dashboard: pet cards tilt toward the mouse** (up to 6°, `perspective(700px)`) with a soft light following the pointer. `useTilt` writes the card's own transform (no parent CSS variables) and keeps the lift + press scale. Mouse only; off with reduced motion.
- Not done: 3D on the Today tiles (they're data you read), WebGL anywhere on the dashboard (one canvas per card would be heavy).

## Data

No backend changes. The dashboard reads `GET /api/reminders/` (open reminders of all pets) once when the list shows and again on `petpulse:due-changed`; due doses come from the existing bell hook (`useDueAlerts`).

## Code structure

```
frontend/src/dashboard.js            pure helpers: greeting(hour), relativeDay(iso, now), petStatus(reminders, petId), nextUp(reminders)
frontend/src/dashboard.test.js       their tests
frontend/src/dueAlerts.js            alerts gain a `kind` ("reminder" | "dose") so the strip can count doses
frontend/src/components/TodaySummary.jsx   the Today strip
frontend/src/components/PetList.jsx        richer card (status line from petStatus)
frontend/src/components/PetProfile.jsx     hero, jump links, coming-soon line
frontend/src/components/OwnerDashboard.jsx greeting, strip, open reminders
frontend/src/styles.css                    motion tokens, card, tile, hero, section-card styles
```

## Testing

- Unit (node --test): greeting boundaries; relativeDay (today, tomorrow, in N days, yesterday, N days ago, across month end); petStatus (overdue wins over next; none); nextUp (skips overdue, soonest first).
- Build passes; backend tests unchanged.
- Browser: desktop and 500 px (Chrome's minimum), keyboard through the strip, cards and jump links; no console errors.

## Out of scope

- Counts on the jump links (would need the panels to report counts upward).
- Sticky jump bar (the shared stage has `overflow: hidden`; changing it affects every page).
- Photos/illustrations, dark mode, VetDashboard.
