# ProjectLens verification

Checked 02 October 2026, 16:53 IST in the requested workspace.

| Check | Result |
| --- | --- |
| Backend JUnit suite | 38 tests, 0 failures, 0 errors |
| Backend package | Maven executable JAR built successfully |
| Java target | Java 17, class-file major version 61; tested using JDK 21.0.5 |
| Frontend production build | Angular 21.2.25, successful; approximately 606 kB raw / 125 kB estimated transfer |
| Dependency audits | 0 known vulnerabilities in full and production npm audits |
| Real database | MySQL 8.0.39, projectlens_db, isolated local port 3307 |
| Browser end-to-end suite | 28 checks passed against the running Angular/Spring/MySQL stack |
| UI verification suite | 14 checks passed: all major routes, four viewport widths, motion, loading, empty/error recovery, session expiry, dialog keyboard access |
| Browser errors | No unexpected console errors or uncaught exceptions |
| Temporary test fixtures | Cleaned; seeded demo projects and decisions preserved |
| Start/stop/restart scripts | Verified; API health UP, frontend HTTP 200, seeded data retained |
| UI inspection | Login, trainer dashboard, submission form, review workspace, and mobile variants inspected |
| Existing data upgrade | Categorized technologies migrated and rule-based provenance populated without recreating submissions or decisions |
| Gemini evaluation | Local HTTP mock and Spring integration checks passed; live external provider not called without a supplied key |
| Secret exposure | Private generated credentials absent from source, frontend bundles and source archive |

## End-to-end checks

- Unauthenticated deep link redirects to login
- Invalid login displays a generic error
- Pod Lead JWT login and empty state
- Angular required-field validation prevents submission
- Live character counter and browser maxlength enforce the 1000-character limit
- Objectives live counter and browser maxlength enforce the 1000-character limit
- Searchable grouped multi-select supports selection indicators and removable chips
- Low-score idea is persisted and returned for improvement
- Categorized technologies and evaluation source survive refresh and logout/login
- Low-score idea is absent from trainer list and inaccessible by ID
- Pod Lead cannot access trainer endpoints
- Revision retains submission ID and exactly 70% qualifies
- Editing and resubmission retain structured technology categories
- Search, pod/status/score filtering, empty state and score sorting use real data
- Trainer requests revision with persisted comments and confirmation
- Pod Member sees trainer feedback and cannot modify or decide
- Angular role guards block member submission and trainer routes
- Revision re-evaluates at 100% and detects high similarity to another pod
- Trainer rejection is stored and shared
- Trainer approval completes the review workflow
- Read-only member view retains all three trainer decisions
- Database-backed notifications and mark-read behavior
- Cohort criteria are read-only and API-backed
- Profile loads authenticated identity from the API
- Mobile layout fits viewport and mobile navigation works
- Logout clears session and blocks protected navigation
- Real MySQL persists final approval and complete decision history
- No unexpected browser console errors or uncaught exceptions

## UI verification checks

- Trainer dashboard includes live alignment distribution, decision snapshot, review queue and overlap alerts
- All major trainer routes render with live API data
- Review tabs, confirmation dialog focus trap and Escape cancellation work without writing a decision
- Trainer pages adapt without horizontal overflow at desktop, laptop, tablet and mobile widths
- API loading displays skeletons and recovers to real dashboard data
- API failure presents a recovery action that reloads the dashboard
- Notification empty state renders a useful explanation
- Expired sessions clear credentials and explain how to recover on the login page
- Live draft coverage and completion update; selected technologies toggle without duplicates
- Submission form and technology selector fit desktop through mobile layouts
- Reduced motion removes nonessential movement and renders the final score directly
- Alignment score animates through intermediate values to the actual persisted result
- Pod evaluation and login provide mobile layouts without overflow
- No uncaught browser exceptions across route, loading, error, empty and motion checks

## Backend coverage

The automated suite exercises the 1,000-character problem statement and Objectives boundaries, including Objectives creation and revision accepting 1,000 characters and rejecting 1,001 without truncating or overwriting saved content, duplicate/category technology validation and persistence, missing-key rule selection, configured Gemini attempt and result selection, missing/duplicate/unknown criterion handling, score/type/range validation, external failures and safe fallback, below/exact-threshold Gemini workflow behavior, stored engine source, independent rule mode, key/header isolation and credential-echo rejection, real HTTP request/schema/response handling through a local mock server, required-field and URL validation, full/partial/zero alignment and whole-phrase matching, no active criteria, exactly 70% qualification, configurable threshold changes, low-score improvement, revision and stale versions, duplicate pod ideas, overlap exclusion and configurable levels, trainer visibility, all three trainer decisions and feedback persistence, BCrypt/JWT login, generic invalid login, malformed/tampered JWTs, anonymous access, role restrictions, cross-pod restrictions, read-only member comments, notification ownership, and read-only criteria methods.

JUnit uses an isolated H2 database in MySQL compatibility mode. The separate browser suite verifies the same core workflow against the actual MySQL application database and queries final stored approval and decision history directly.

## Runtime and MVP boundaries

The application is running at http://127.0.0.1:4200 with its API on port 8080. The original MySQL Windows service was left unchanged; a separate task-local instance hosts this demo. Generated credentials stay in ignored work/local-config.json and are excluded from the source archive.

The rubric is a seeded sample for the single predefined cohort theme. Evaluation defaults to AUTO: optional Gemini semantic assessment when configured, otherwise reliable local keyword scoring. Overlap remains local token similarity. The 70% default threshold is always enforced by ProjectLens. Documentation is supplied as a validated URL, not an uploaded file. Proposal/evaluation snapshots are replaced on revision, while trainer decision history is retained. Notification delivery is in-app, without email or push. Docker Compose setup is supplied as an alternative but was not exercised on this workstation.

The UI has a cohesive ink/indigo/teal design, selected Lucide icons, radial score motion, alignment distribution, queue and alerts, logical form sections and provisional draft coverage, grouped searchable multi-select, retained category chips, typed toasts, skeletons, error recovery, responsive table rows, and reduced-motion handling.

See README.md for commands, optional Gemini configuration, technology contract and migration, and detailed assumptions.
