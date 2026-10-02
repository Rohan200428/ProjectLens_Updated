# ProjectLens Studio verification

Verified 02 October 2026, 19:41 local time. This report describes the current structural redesign. BASELINE-VERIFICATION.md records the original backend verification.

## Delivered result

Taste's audit, anti-generic design and frontend engineering guidance informed the implementation. Awesome DESIGN.md's bundled Framer study informed type scale, focal composition, visual rhythm and motion. ProjectLens has its own forest, orange, lime and mineral identity.

The reconstructed dashboard places an unboxed review desk and decision ledger around a large alignment visualization; an editorial project stream and real overlap connections follow it. An expanding floating dock replaces the full-height sidebar. Submission and review directories combine the existing collection controls with selectable real project previews. The form has three numbered chapters, an outline and provisional draft coverage. Evaluation/review uses an insight rail, tabbed evidence and trainer decisions. Criteria accordions, an inbox, identity passport, pod case file and two-panel login complete the system.

Motion includes route scenes, a morphing navigation indicator, dock expansion, staggered viewport reveals, 850ms real count/score animation, distribution bars, row context, previews, accordions, technology selection, validation, tabs, menus, loading, dialogs and toasts. Reduced-motion behavior and keyboard access remain available. No dependencies were added.

## Verification evidence

| Check | Result |
| --- | --- |
| Angular production build | Passed; 682.97 kB initial raw / 136.44 kB estimated transfer, below 700 kB warning budget |
| Real-stack workflows | 28 passed against Angular, unchanged Spring backend and original MySQL |
| UI states/interactions | 14 passed; loading, recovery, empty states, expiry, form, selector, score animation, reduced motion, tabs and dialog |
| Route/responsive audit | 282 passed; 280 route renders and two keyboard/form checks |
| New Studio interactions | 7 passed; dock, stream, preview, mobile focus, accordion, counts and reduced-motion reveals |
| Full redesign browser checks (prior audit) | 331 passed; no uncaught browser exceptions |
| Roles/routes | Trainer, Pod Lead, Pod Member, fresh lead; all available route patterns plus login |
| Viewports | 320, 390, 768, 1024 and 1440px; light and dark preferences; no page-level horizontal overflow |
| Protected files | All 64 backend/auth/API/model/route/dependency hashes unchanged |
| Component behavior | 177 existing frontend class members preserved; allowed additions are presentation helpers |
| CSS processing | PostCSS/Tailwind/Autoprefixer passed with zero warnings |
| Key contrast | 23 foreground/background pairs passed at 4.5:1 or above |
| Rendered contrast | 1142 visible text samples on solid surfaces, zero failures |
| Field limits | Problem statement and Objectives retain 1,000-character limits; browser and API checks passed |
| Fixtures | Both temporary fixture sets cleaned; seeded ideas and decisions preserved |
| Runtime | Frontend http://127.0.0.1:4200; backend health UP on 8080; original local MySQL on 3307 |
| Secrets | Private generated credentials excluded from source, frontend output and ZIP; Gemini key stays backend-only |

Contrast sampling is an automated check of text and composited solid backgrounds on selected pages in light/dark preferences. It does not verify every interaction state or certify full WCAG compliance. Keyboard focus, tabs, drawer state and dialog focus trapping were checked separately.

Backend logic, authentication/authorization, APIs, schema, evaluation/Gemini integration, business rules and role permissions were not changed. The historical 38 passing backend tests and dependency audits remain in BASELINE-VERIFICATION.md; they were not rerun for this UI-only change. No live external Gemini request was needed.

## Visual inspection

Fresh screenshots in outputs cover desktop and mobile login, trainer dashboard, dark dashboard, submissions, empty review queue, trainer review, pod/member dashboards, empty pod, creation form, mobile form, mobile evaluation, criteria, notifications and profile. Selected final screenshots were inspected for composition, legibility and controls. The final dashboard removes enclosing boxes from focus and decisions so the alignment stage leads the composition. Mobile proposal navigation is compact and chapter fields remain readable.

Real API data supplies the screenshots. The current review queue has no pending proposals; the state suite creates and cleans a temporary pending proposal to verify decision controls. Simulated browser-only 401/503 and empty responses exercise recovery without changing application behavior.

## Reproduce

Start scripts/start-demo.ps1 and select a supported Node runtime with scripts/resolve-node.ps1. Then run:

```text
cd frontend
npm run build
cd ..
node scripts/e2e.mjs
node scripts/e2e-ux.mjs
node scripts/e2e-design.mjs
node scripts/e2e-studio.mjs
```

The fixture suites require the local demo database, private work/local-config.json and the documented demo seed/default 70% rule threshold. Use AUTO without an external key or RULE_BASED for deterministic workflow scores. Detailed evidence is stored under work/e2e, work/ux, work/redesign and work/radical in the running workspace. Private work files and installed/build dependencies are excluded from the source ZIP.

## Studio interaction checks

- Navigation dock expands and collapses with an accessible state
- Project stream reveals technology context on hover and keyboard focus
- Selecting a submission updates its real preview, score, technologies and evaluation action
- Mobile preview selection moves focus and scrolls to project context
- Rubric accordion exposes real learning objectives and supports keyboard toggling
- Real cohort counts animate through intermediate values to the final API value
- Reduced motion renders counts immediately and bypasses viewport reveals

## Subsequent submission form fixes

Verified 02 October 2026, 20:40 local time.

- The proposal heading reads "Give your idea a clear direction." Normal whitespace replaces the hidden line break that previously joined "idea" and "a" at smaller widths.
- The technology options region is focusable. Native scrollbar clicks now transfer focus within the selector, preserving the dropdown while its scrollbar track or thumb is used. Existing outside-click/focus dismissal and selection behavior remain unchanged.
- Production build passed: 682.96 kB initial raw / 136.41 kB estimated transfer.
- Twelve native-scrollbar regression checks passed at 1440px light, 714px dark, and 390px light. Playwright's default hidden scrollbar was explicitly disabled so these checks exercise actual mouse track clicks and thumb dragging, alongside wheel/keyboard scrolling, selection, Escape, Done, outside focus and outside clicks.
- No browser exceptions; all 177 existing frontend class members still match the functional baseline. No submissions were saved by these checks.

Run `node scripts/e2e-selector.mjs` with the local demo running and the supported Node runtime. Results are written to `work/selector/results.json`.
