# ProjectLens Studio design system

## Direction and references

A project studio for trainers and pod teams: ideas, evidence, and decisions have distinct visual rhythms. The application has an expressive forest canvas, orange alignment stage, lime preparation and identity surfaces, and readable proposal documents. Its composition changes with the task rather than repeating a dashboard card grid.

Taste settings: DESIGN_VARIANCE 8, MOTION_INTENSITY 8, VISUAL_DENSITY 6. Taste's audit and anti-generic guidance informed asymmetric composition, expressive navigation, varied surfaces, typography, and motion. Its frontend UI engineering workflow informed the existing Angular implementation, keyboard behavior, responsive layouts, and state handling. Awesome DESIGN.md's bundled Framer study informed typographic scale, focal surfaces, content rhythm, and continuity through motion. ProjectLens uses its own product identity and palette.

## Color and typography

| Token | Value | Role |
| --- | --- | --- |
| Canvas | #111815 | Forest-black workspace and header |
| Navigation | #243229 | Floating dock |
| Alignment | #f0a47f | Orange focal visualization and shell actions |
| Readiness | #deedbf | Lime draft coverage and identity |
| Paper | #f4f5ef | Light reading surfaces |
| Ink | #202b25 | Reading text |
| Muted | #5c655e | Secondary reading text |
| Primary | #98411c | White-text actions on reading surfaces |

Dark preference changes reading-surface tokens to dark green with light text. Orange and lime focal surfaces retain their identities in both preferences. Status colors always accompany a textual label. Color is not the only indication of state.

Bahnschrift display headings fall back to Segoe UI Variable Display / Segoe UI. Body text uses Segoe UI Variable Text / Segoe UI / system-ui; numerical details and counters use Consolas / monospace. Fonts are installed-system fallbacks with no download. Main headings scale from 34 to 58px, with a tighter mobile treatment; reading text is generally 14px, metadata 12px. Large alignment scores and count typography lead the dashboard.

Spacing uses 4, 8, 12, 16, 24, 32, 40, and 48px. Controls have 10px radii; focal and reading regions use 20–24px. Circles carry score rings, account initials, navigation actions, and connection markers. Hairlines organize the project stream and decision ledger. Selective elevation identifies the dock, menus, preview, and overlays.

## Composition by task

- Shell: 80px contextual header and a floating 84px navigation dock inset 24px from the canvas. Expansion reveals 224px navigation with labels, cohort context, and account identity. Active navigation morphs between routes. Mobile uses the existing accessible menu as a 240px drawer beneath a 68px header.
- Trainer dashboard: three unequal regions place an unboxed review desk beside an orange alignment stage and unboxed decision ledger. The stage includes an animated real average, qualifying count, and three-bin distribution. A thin cohort ribbon separates this from an editorial project stream and a contrasting overlap-connections area. Stream rows reveal technology context on hover and keyboard focus.
- Submission/review directory: searchable, filterable, sortable, paginated collection paired with a persistent project preview. Selecting Preview updates real title, problem, score, technologies, overlap, and evaluation action. On mobile selection moves focus and scrolls to the preview. Existing table operations remain available.
- Pod dashboard: a project case file pairs the idea with score/actions, then a three-stage workflow and actual next action or trainer feedback. Empty pods expose the existing new-submission action; Pod Members retain read-only access.
- Creation/revision: one continuous proposal with three numbered chapters: Define the idea, Set the outcomes, Plan the build. A linked outline and lime provisional draft-coverage preview sit beside the document. Completion remains visible at the document top. All fields are available together; submit/cancel controls follow the last chapter. Problem and Objectives counters retain 1,000-character limits. Supporting criteria expand in the aside.
- Evaluation/trainer review: an insight rail with a large animated score ring, matched/missing evidence, and overlap meter sits beside tabbed evidence and a decision/comment area. The source and explanation remain visible. Arrow keys, Home, and End navigate tabs; confirmation preserves focus trapping and return focus.
- Criteria: orange cohort/threshold context beside ten numbered native accordions containing actual descriptions, keywords, and learning objectives. The first is open initially; each supports keyboard toggling.
- Notifications: unread count and contextual filters beside an inbox list with real read state and actions.
- Profile: lime identity passport beside structured account/access information and sign-out.
- Login: inset two-panel composition, oversized lime brand introduction, CSS lens geometry, and a readable sign-in panel with the existing demo-account selector.

## Motion and interactions

Native Angular view transitions provide a 280ms outgoing scene and 650ms arriving scene. The active navigation surface moves over 500ms. Dock expansion and workspace movement take 450ms. Section reveals use a one-shot IntersectionObserver with staggered transform/opacity entrances. Large data counts and score rings animate over 850ms to actual API values. Distribution bars, preview selection, accordions, controls, technology chips, validation, loading, tabs, dialogs, and toasts provide visible state feedback. A slow 15-second lens rotation adds motion only to the login motif.

Count animation avoids reactive self-restarts and cancels frames on destruction. Reveals disconnect after entry and clean up on destruction. Most movement uses transform and opacity; width/margin animation is limited to intentional dock expansion. No animation dependency was added. Reduced-motion preference skips route animation, renders final counts/scores directly, bypasses viewport reveals, and suppresses nonessential CSS motion.

## Responsive and accessible behavior

The review decision region stacks below evidence under 1400px; dashboard regions recompose at laptop widths. Under 900px the form aside and evaluation insight rail move above the reading document. Under 767px the drawer replaces the dock, chapters and previews become a single reading flow, the proposal outline becomes a compact three-column row, and dashboard regions stack with intentional priority. Directories retain their existing grouped mobile rows and all filters/actions. Layouts are verified at 320, 390, 768, 1024, and 1440px in light/dark preferences.

Fields retain labels and errors, actions have touch-sized targets, focus stays visible, selected controls expose state, and status labels accompany color. Empty, loading, error, expiry, disabled, and confirmation states remain part of the interface. Automated contrast checks cover key token pairs and rendered text on solid surfaces; these checks do not constitute a complete accessibility certification.

## Implementation and functional boundary

frontend/src/styles.css retains shared control and state foundations. frontend/src/studio.css follows it in the Angular build and owns the Studio tokens, composition, and motion. Sixty-five obsolete layout rules were retired. Shell and dashboard templates are external HTML; the metric component and reveal directive are small native Angular presentation utilities.

All backend, database, authentication, authorization, API contracts, evaluation/Gemini integration, role permissions, submission/revision rules, form validators, and domain behavior remain unchanged. Protected-file hashes and existing component-member comparisons verify this boundary. Added class helpers concern navigation, keyboard tabs, and selecting a submission preview. Draft coverage is explicitly provisional; the persisted evaluation is authoritative. Every project, count, decision, criterion, and overlap signal uses existing real application data.
