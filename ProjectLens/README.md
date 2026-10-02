# ProjectLens

ProjectLens is a working local project idea evaluator for trainers, Pod Leads, and Pod Members. A Pod Lead submits one idea against the predefined cohort theme, receives an explainable evaluation, and revises it when needed. Only qualifying ideas reach the trainer, whose decisions and comments are shared with the pod.

The implementation follows the supplied ProjectLens FRD’s textual functional requirements and the requested visual redesign. FRD images are workflow references, not the design authority. The theme-creation screenshot is illustrative: the textual FRD explicitly defines preconfigured criteria, so the application provides a read-only criteria page.

## Open the running demo

Open **http://127.0.0.1:4200**. The API runs at **http://127.0.0.1:8080/api/health**. This workspace has an isolated MySQL 8.0 instance on **127.0.0.1:3307**, database **projectlens_db**. It does not modify the existing MySQL Windows service on port 3306.

The demo scripts serve Angular’s optimized production configuration, which avoids the large development prebundle during browser verification. For development mode, use `scripts/run-frontend.ps1 -Development` or `npm start` from `frontend/`.

All sample accounts initially use **`ProjectLens123!`**. This is a development seed password, stored as BCrypt hashes in MySQL and never returned by the API.

| Role       | Email                   | Demo state                                                           |
| ---------- | ----------------------- | -------------------------------------------------------------------- |
| Trainer    | trainer@projectlens.com | All qualifying pods; pending, approved, revision, and rejected ideas |
| Pod Lead   | lead1@projectlens.com   | Pod Atlas: below-threshold idea to improve                           |
| Pod Lead   | lead2@projectlens.com   | Pod Forge: trainer requested revision                                |
| Pod Member | member1@projectlens.com | Read-only Pod Atlas evaluation                                       |
| Pod Member | member2@projectlens.com | Read-only Pod Forge feedback                                         |
| Pod Lead   | lead3@projectlens.com   | Pod Canopy: approved ResourceGuard idea                              |
| Pod Lead   | lead4@projectlens.com   | Pod Orbit: idea awaiting trainer review                              |
| Pod Lead   | lead5@projectlens.com   | Pod Terra: rejected idea eligible for reconsideration                |
| Pod Lead   | lead6@projectlens.com   | Pod Nova: empty pod for a new submission demonstration               |

Corresponding `member3` through `member6` accounts also exist. Login includes an expandable demo-account selector.

## Features

- JWT login, BCrypt password verification, logout, expiry handling, route guards, and server-side role checks.
- Role-specific trainer, Pod Lead, and Pod Member workspaces.
- Three-chapter submission form with 1,000-character limits and live counters for both Problem statement and Objectives, provisional draft coverage/completeness preview, and documentation URL.
- Searchable, grouped technology multi-select with removable chips; names and categories persist in MySQL through refresh, login, revisions, and reviews.
- One submission per pod for the single active predefined theme, enforced by a database uniqueness constraint.
- Rule-based scoring preserved, plus optional Gemini semantic evaluation of the same cohort criteria, automatic fallback, stored engine source, and explanation.
- Cross-pod overlap detection with similarity, shared terms, closest idea, and configurable levels.
- Automatic below-threshold improvement workflow and qualifying trainer review workflow.
- Trainer search, pod/status/overlap/score filtering, sorting, and eight-item pagination over real API results.
- Trainer centerpiece with live alignment distribution, review queue, overlap alerts, and decision snapshot.
- Approval, revision requests, rejection, comments, timestamps, and complete trainer decision history.
- Read-only pod member evaluations and trainer feedback.
- Database-backed notifications with unread counts and mark-as-read support.
- Read-only predefined criteria and profile information.
- ProjectLens Studio visual system: forest canvas, orange alignment stage, lime preparation surfaces, expanding navigation dock, asymmetric review desk, project stream, submission previews, chapter-based proposal form, split evaluation workspace, rubric accordions, inbox, and identity passport. Route entrances, staggered reveals, animated counts/scores, responsive light/dark reading surfaces, and keyboard interactions share one system. Reduced-motion preferences suppress nonessential movement. See DESIGN.md and REDESIGN-VERIFICATION.md.

## Architecture and folders

```text
Angular standalone components + Router + HttpClient + Reactive Forms
    -> JWT interceptor
    -> Spring Security (JWT validation and database role resolution)
    -> REST controllers / validated DTOs
    -> Transactional services
    -> Spring Data JPA repositories
    -> MySQL 8
```

```text
backend/
  pom.xml
  src/main/java/com/mfrp/plens/
    ProjectLensApplication.java
    config/       # security, JWT filter, configuration, database seeding
    controller/   # auth, submissions, reviews, dashboard, criteria, notifications
    dto/          # validated request records and explicit response records
    exception/    # centralized JSON errors
    model/        # JPA entities and enums
    repository/   # Spring Data JPA interfaces and locking queries
    service/      # authorization, evaluation, overlap, workflows and DTO mapping
  src/main/resources/application.properties
  src/test/       # JUnit integration and evaluation tests
frontend/
  src/app/
    core.ts       # auth, guards, interceptor, typed API and toasts
    models.ts     # API contracts
    routes.ts
    shell.component.ts
    pages/        # login, dashboards, form, details/review, criteria, notifications, profile
  src/styles.css  # Tailwind and responsive design system
  proxy.conf.json
scripts/          # Windows demo setup/run/stop and repeatable browser test
compose.yaml      # optional isolated Docker MySQL
outputs/          # source archive, run guide and verification evidence
work/             # ignored local database, generated secrets, logs, test scratch
```

The seven core entities are `User`, `Pod`, `CohortCriteria`, `ProjectSubmission`, `SubmissionEvaluation`, `TrainerDecision`, and `Notification`. JPA uses foreign keys, relational collections, identity keys, timestamps, enums, and an optimistic version on submissions. Services own the workflows; controllers never return JPA entities.

## Requirements

- Java **17 or newer** and Maven **3.6.3+**. The backend targets Java 17 bytecode. This workstation uses JDK 21 with the Java 17 compiler release target. [Spring Boot requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html).
- Node **20.19+**, **22.12+**, or **24+**, plus npm. Angular 21.2 and TypeScript 5.9 are used. The supplied Windows launch scripts automatically select a compatible installed runtime or Codex's bundled Node 24 when the system Node is too old. [Angular compatibility](https://angular.dev/reference/versions).
- MySQL **8+**, either your configured server, the isolated native demo instance, or Docker Compose.

The backend uses Spring Boot 3.5.16, Spring Web, Spring Security, Bean Validation, JPA/Hibernate, MySQL Connector/J, and Spring Security's Nimbus JWT support. H2 is a **test-only** dependency. The real application uses MySQL.

## Start this workspace on Windows

From the project root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-demo.ps1
```

For a rebuild and backend test run before startup, first stop the app, then use:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-demo.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-demo.ps1 -Build
```

The first startup builds a backend JAR when one is absent and installs frontend dependencies when needed. Wait for the API health endpoint and Angular's ready message. Startup logs are in `work/backend.stdout.log`, `work/backend.stderr.log`, `work/frontend.stdout.log`, and `work/frontend.stderr.log`.

Run in separate terminals when you want visible logs:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-backend.ps1 -UseMaven
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-frontend.ps1
```

`setup-local-mysql.ps1` creates the native demo database under `work/mysql-data` using the installed MySQL binaries. It generates local database and JWT secrets, stores them in ignored `work/local-config.json`, and limits that file to the current Windows user. Do not include this file in an archive or commit. If the MySQL installation is elsewhere, run the setup script with `-MySqlBin 'your/MySQL/bin'` before startup.

## Use an existing MySQL server

Create a separate database and application user with your chosen local credentials:

```sql
CREATE DATABASE projectlens_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'projectlens'@'localhost' IDENTIFIED BY 'YOUR_LOCAL_PASSWORD';
GRANT ALL PRIVILEGES ON projectlens_db.* TO 'projectlens'@'localhost';
```

Set environment variables, then run Maven directly. `run-backend.ps1` intentionally loads the generated demo configuration if it exists, so use direct Maven commands for a different database.

```powershell
$env:DB_URL='jdbc:mysql://127.0.0.1:3306/projectlens_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
$env:DB_USERNAME='projectlens'
$env:DB_PASSWORD='YOUR_LOCAL_PASSWORD'
$env:JWT_SECRET='YOUR_RANDOM_SECRET_OF_AT_LEAST_32_BYTES'
Set-Location backend
mvn spring-boot:run
```

On Linux/macOS, export the same variables and run `mvn spring-boot:run` in `backend/`.

Start the frontend in another terminal with a compatible Node runtime:

```sh
cd frontend
npm ci
npm start
```

`npm start` runs Angular on port 4200 and proxies `/api` to port 8080. If you change the API port, change `frontend/proxy.conf.json` too.

## Optional Docker database

Copy `.env.example` to `.env`, replace the example passwords and JWT secret, then run:

```sh
docker compose up -d mysql
```

This exposes a separate MySQL instance on **127.0.0.1:3308**, with a durable named volume. Export `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` in the backend shell, then start Maven. Docker Compose reads `.env`; Spring Boot does **not** automatically read `.env`.

## Configuration

| Environment variable   | Default                                | Purpose                                                                           |
| ---------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| DB_URL                 | localhost:3306/projectlens_db JDBC URL | MySQL connection                                                                  |
| DB_USERNAME            | projectlens                            | Database user                                                                     |
| DB_PASSWORD            | empty                                  | Supply your configured database password                                          |
| JPA_DDL_AUTO           | update                                 | JPA schema generation                                                             |
| SERVER_PORT            | 8080                                   | API port                                                                          |
| JWT_SECRET             | generated in dev/test if absent        | At least 32 bytes; required outside dev/test                                      |
| JWT_HOURS              | 8                                      | JWT lifetime                                                                      |
| REVIEW_THRESHOLD       | 70                                     | Alignment score needed for review                                                 |
| OVERLAP_MEDIUM         | 0.25                                   | Medium Jaccard similarity boundary                                                |
| OVERLAP_HIGH           | 0.55                                   | High Jaccard similarity boundary                                                  |
| CORS_ORIGINS           | localhost:4200,127.0.0.1:4200          | Allowed browser origins                                                           |
| SEED_ENABLED           | true                                   | Insert fake demo data when users table is empty                                   |
| SEED_PASSWORD          | ProjectLens123!                        | Password for newly seeded demo users                                              |
| SPRING_PROFILES_ACTIVE | dev is default                         | Select `test` for isolated tests; explicitly configure secrets for other profiles |

The seed process is idempotent: it runs only against an empty users table. It does not overwrite submissions or decisions on restart. Changing the seed password does not change already-seeded accounts. All SQL credentials are configuration, not authentication logic.

## Authentication and authorization

`POST /api/auth/login` validates an email/password against the database using BCrypt and returns an HS256 JWT, expiry, and a password-free user DTO. Incorrect credentials produce the same generic 401 message. The Angular client keeps the session in **sessionStorage** and attaches the JWT only to application API calls. Logout clears it and returns to `/login`; expiry or an API 401 also signs the user out.

The JWT contains an identity; the backend retrieves the current role from MySQL for protected requests. It does not trust a role supplied by the frontend. Request-level role rules and method-level rules protect writes and trainer endpoints. Services additionally enforce pod ownership and the score threshold. Pod Members can read their own pod's data but cannot create, revise, or decide.

The MVP has no OAuth, MFA, refresh-token service, or server-side token revocation list. A copied JWT remains usable until it expires; frontend logout removes the browser's stored token.

## Business rules and rule-based scoring

The active theme is **AI-enabled enterprise applications**, with ten database-seeded criteria. The FRD does not enumerate final keyword weights, so these demo criteria are the explicit sample rubric shown in the UI.

1. Combine title, problem statement, objectives, and technology stack. The documentation URL itself does not earn points.
2. Normalize Unicode and case, replace punctuation with spaces, and compare whole words/phrases with each criterion's allowed keywords.
3. A criterion matches if any of its listed keywords/phrases is present.
4. **Score = matched criteria / active criteria × 100**, rounded to two decimals. Each of the ten sample criteria is worth 10 points.
5. Scores below `REVIEW_THRESHOLD` become `NEEDS_IMPROVEMENT`. They cannot be listed, opened, or decided on by trainers.
6. Scores at or above the threshold become `PENDING_REVIEW`. Exactly 70% qualifies with the default configuration.
7. The trainer records `APPROVED`, `NEEDS_REVISION`, or `REJECTED`, with required comments, trainer identity, and timestamp.
8. Pod Leads can revise ideas needing improvement, revision, or reconsideration after rejection. Pending and approved ideas are locked against revision. A revision re-evaluates the same submission and retains prior trainer decisions.
9. A new decision is allowed only while the submission is pending. Database locks and a version number prevent duplicate or stale updates.
10. Evaluation and decision notifications are created in the same transaction as the workflow change.

`ProjectEvaluationEngine` remains the abstraction. `ConfiguredEvaluationEngine` selects between the preserved `RuleBasedEvaluationEngine` and `GeminiEvaluationEngine`. Overlap detection runs independently using the existing local engine. A key is optional; the app works fully without one.

## Optional Gemini evaluation

| Backend environment variable | Default | Behavior |
| --- | --- | --- |
| EVALUATION_MODE | AUTO | AUTO, RULE_BASED, or GEMINI |
| GEMINI_API_KEY | empty | Backend-only key; never put it in Angular or source files |
| GEMINI_MODEL | gemini-2.5-flash | Configurable generateContent model |
| GEMINI_TIMEOUT_SECONDS | 12 | Whole request timeout; validated range 1–60 seconds |

AUTO attempts Gemini when a key is configured; otherwise it uses rules. GEMINI also retains fallback for missing keys or any failure. RULE_BASED never calls Gemini, even with a key present. Set environment variables in the backend process and restart it; `.env` is not automatically loaded by Spring Boot. The local startup scripts inherit environment variables.

`GeminiClient` is the isolated HTTP boundary. It uses a backend `x-goog-api-key` header, a fixed HTTPS origin, no redirects, a five-second connect timeout, and a bounded response size. It sends title, problem, objectives, categorized technologies, cohort theme, criteria, learning objectives, and keywords. Project content is treated as untrusted data within a separate user message. It requests JSON Schema output following [Google’s structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en).

Results are accepted only when the score is numeric and finite within 0–100, explanation is present, and every known active criterion ID appears exactly once in matched or missing criteria. Unknown, duplicate, missing, wrong-type, truncated, or malformed results fall back to rules. Recommendation text is advisory; ProjectLens alone applies `REVIEW_THRESHOLD`, including exactly 70% qualification. External errors and response bodies are not logged. Credential echoes are rejected. No key is included in DTOs or stored in MySQL.

Each evaluation stores `source` (`RULE_BASED` or `GEMINI`) and `explanation`. Existing evaluations receive RULE_BASED provenance and their original rule explanation. Tests cover the real HTTP client against a local mock server and Gemini/rule workflow selection through Spring MVC/JPA. No live paid Gemini request was made because no external key was supplied.

## Structured technology contract and upgrade

`GET /api/technologies` returns the authenticated read-only catalog. Frontend, backend, and database options are separate; languages, DevOps/cloud, and tools are also supported. Every request/response uses structured selections, for example:

```json
"technologyStack": [
  { "name": "Angular", "category": "FRONTEND" },
  { "name": "Spring Boot", "category": "BACKEND" },
  { "name": "MySQL", "category": "DATABASE" }
]
```

One to forty selections are permitted. Duplicate names are rejected regardless of case; catalog categories are validated and names canonicalized. Previous noncatalog tools are retained in TOOLS_OTHER. Selections persist in the ordered `submission_technologies` collection. Startup migration copies legacy stack strings into the collection without recreating submissions or changing decisions. The old column is retained internally for migration compatibility; it is not the API contract. Selected names feed the unchanged keyword and overlap algorithms.

`problemStatement` and `objectives` are required, 10–1,000 characters each, in both Angular and Bean Validation. Both textareas use `maxlength=1000` and live counters. Requests exceeding either limit return 400 for creation and revision; content is never silently truncated.

The form’s preview is explicitly provisional local keyword coverage. The persisted final result is authoritative and can differ when Gemini evaluates semantic evidence.

## Overlap detection

The engine tokenizes the same idea text, removes common stop words and short terms, and computes **Jaccard similarity = shared unique tokens / combined unique tokens**. It ignores the current submission and all ideas belonging to the same pod. It stores the closest other-pod idea, similarity, shared terms, and explanatory details.

- Below 0.25: `LOW`, no flag.
- At least 0.25 and below 0.55: `MEDIUM`, flagged.
- At least 0.55: `HIGH`, flagged.

These boundaries are configurable. Similarity is evidence for trainer consideration, not proof of duplicate scope. Evaluations are snapshots calculated on submission/resubmission; changes in another pod do not silently overwrite an older evaluation.

## API overview

All protected endpoints require `Authorization: Bearer <JWT>`. GET list responses are arrays; dashboard/criteria/detail responses are explicit DTO objects.

| Method / route                      | Access / behavior                              |
| ----------------------------------- | ---------------------------------------------- |
| POST /api/auth/login                | Public credential verification                 |
| GET /api/auth/me                    | Authenticated profile                          |
| GET /api/health                     | Public readiness/basic application identity    |
| POST /api/submissions               | Pod Lead; save and evaluate; 201 with Location |
| GET /api/submissions/my             | Pod Lead/Member; own pod only                  |
| GET /api/submissions/{id}           | Own pod, or trainer when qualifying            |
| PUT /api/submissions/{id}           | Pod Lead revision and evaluation               |
| POST /api/submissions/{id}/resubmit | Pod Lead revision and evaluation               |
| GET /api/reviews                    | Trainer; qualifying ideas only                 |
| GET /api/reviews/{id}               | Trainer; qualifying evaluation                 |
| POST /api/reviews/{id}/decision     | Trainer; pending idea only                     |
| GET /api/dashboard/trainer          | Trainer; qualifying stats and ideas            |
| GET /api/dashboard/pod              | Own pod stats and idea                         |
| GET /api/technologies               | All authenticated users; grouped technology catalog |
| GET /api/criteria                   | All authenticated users; read-only rubric      |
| GET /api/notifications              | Current user's notifications                   |
| PATCH /api/notifications/{id}/read  | Owner only                                     |

Submission requests contain the five form fields. Revisions also include `version` from the current response. Decision requests contain `decision`, `comments`, and `version`.

```json
{
  "decision": "NEEDS_REVISION",
  "comments": "Define measurable success criteria and differentiate the scope.",
  "version": 1
}
```

Centralized errors include timestamp, status, message, path, and field-level errors where applicable. Validation/malformed requests return 400, invalid authentication 401, forbidden access 403, unavailable resources 404, unsupported methods 405, and duplicates/stale updates/invalid transitions 409.

## Build and test

Backend tests use H2 in MySQL compatibility mode, with real Spring Security, MVC, JPA, BCrypt, and JWT services. The browser test separately verifies the complete flow against **real MySQL**.

```sh
cd backend
mvn test
mvn package
```

```sh
cd frontend
npm ci
npm run build
```

The repeatable Windows browser test requires the local demo services, generated `work/local-config.json`, and Playwright Chromium:

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
```

It creates temporary pod/users with BCrypt hashes copied from the demo seed, verifies low-score submission, threshold revision, trainer filtering, all three decisions, member restrictions, notification delivery, responsive navigation and logout, checks persistence directly in MySQL, then removes its fixtures. It assumes the default sample seed password and threshold. It does not alter seeded demo decisions. Evidence is in `work/e2e/`.

When rebuilding a running backend on Windows, stop it first: the running JVM holds its JAR open. The saved verification report in `outputs/` records the final checked build, test counts, browser results, and runtime versions.

## MVP assumptions and future improvements

- One predefined theme is active; new cohorts and theme management are outside the FRD scope.
- Rule matching is transparent but does not assess semantic quality or prevent keyword stuffing. Optional Gemini assesses semantic evidence; trainer judgment remains necessary in either mode.
- Revisions replace the proposal/evaluation snapshot while preserving all trainer decisions. Full proposal version history is a future enhancement.
- Dashboard filtering, sorting, and pagination occur in Angular over backend-authorized data; large cohorts may benefit from server-side pagination later.
- Documentation links are validated URLs and are not fetched or uploaded. Seed links use `example.com` as illustrative placeholders.
- Notifications appear on page load/refresh and after reading; there is no email or push delivery.
- Production deployment would need managed secrets, HTTPS, migrations, token revocation/rate limiting, and deployment-specific configuration. Local demo configuration is provided here.

Useful later additions include cohort/version management if requirements expand, live notification delivery, and server-side pagination.


## Visual and interaction verification

Run `node scripts/e2e-ux.mjs` from the workspace root after starting the demo. It exercises all main trainer routes at 1440, 1024, 768, and 390px, form and evaluation responsiveness, real score animation, reduced motion, skeleton loading, API error recovery, empty notifications, expired sessions, preview updates, technology toggle behavior, review tabs, and confirmation-dialog keyboard focus. It creates temporary pod/users and a pending proposal so the review checks also work when the real queue is empty, then removes those fixtures. It does not save trainer decisions or alter seeded proposals. Expected 401/503 and empty states are simulated only in the test browser.

Run `node scripts/e2e-design.mjs` for the read-only route audit. It checks Trainer, Pod Lead, Pod Member, and a lead with no proposal across every route available to each account, plus login, at 320, 390, 768, 1024, and 1440px in both light and dark preferences. It verifies horizontal containment, evidence-tab keyboard navigation, the Objectives counter at 1,000 characters, and mobile drawer state. It exports current screenshots to `outputs/` and saves its detailed result in `work/redesign/route-audit.json`.

The main `node scripts/e2e.mjs` suite uses temporary MySQL pod/user fixtures for the complete submission/revision/review workflow and removes its fixtures afterward. Tests assume the demo seed password and default 70% threshold; run the browser workflow in AUTO with no key or RULE_BASED for deterministic scores.

Run `node scripts/e2e-studio.mjs` for seven read-only interaction checks covering dock expansion, hover/keyboard project context, real submission previews, mobile preview focus, rubric accordion keyboard behavior, animated API counts, and reduced-motion reveals. It saves its results to `work/radical/studio-results.json`.

The frontend uses selected `@lucide/angular` icons, native CSS/view transitions, IntersectionObserver reveals, and requestAnimationFrame count/score animation. This redesign adds no dependencies. The existing `piscina` override pins 5.3.2 for Angular's compatible build worker dependency; dependency audit results from the unchanged dependency baseline are recorded in BASELINE-VERIFICATION.md.

Run `node scripts/e2e-selector.mjs` for the native technology-scrollbar regression checks (track clicks, thumb dragging, wheel/keyboard scrolling and picker close/selection behavior). It uses read-only demo login and does not save submissions.
