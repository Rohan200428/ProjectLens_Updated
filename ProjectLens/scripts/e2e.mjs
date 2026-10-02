import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(root, "frontend/package.json"));
const { chromium, expect } = require("@playwright/test");
const config = JSON.parse(
  readFileSync(join(root, "work/local-config.json"), "utf8").replace(
    /^\uFEFF/,
    "",
  ),
);
const evidenceDir = join(root, "work/e2e");
mkdirSync(evidenceDir, { recursive: true });
const checks = [];
const errors = [];
const suffix = randomUUID().slice(0, 8);
const leadEmail = `e2elead-${suffix}@projectlens.com`,
  memberEmail = `e2emember-${suffix}@projectlens.com`;
const title = `Code Insight ${suffix}`;
const app = "http://127.0.0.1:4200";
function sql(query) {
  const r = spawnSync(
    join(config.mysqlBin, "mysql.exe"),
    [
      "--no-defaults",
      "--host=127.0.0.1",
      `--port=${config.port}`,
      `--user=${config.dbUsername}`,
      "--batch",
      "--skip-column-names",
      "projectlens_db",
    ],
    {
      input: query,
      encoding: "utf8",
      env: { ...process.env, MYSQL_PWD: config.dbPassword },
    },
  );
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim().replaceAll("\r\n", "\n");
}
function pass(name) {
  checks.push(name);
  console.log("PASS " + name);
}
sql(`INSERT INTO pods(name,created_at,updated_at) VALUES ('Test Pod ${suffix}',UTC_TIMESTAMP(),UTC_TIMESTAMP());
SET @pod=LAST_INSERT_ID();
INSERT INTO app_users(name,email,password,role,pod_id,created_at,updated_at) SELECT 'Test Pod Lead','${leadEmail}',password,'POD_LEAD',@pod,UTC_TIMESTAMP(),UTC_TIMESTAMP() FROM app_users WHERE email='trainer@projectlens.com';
INSERT INTO app_users(name,email,password,role,pod_id,created_at,updated_at) SELECT 'Test Pod Member','${memberEmail}',password,'POD_MEMBER',@pod,UTC_TIMESTAMP(),UTC_TIMESTAMP() FROM app_users WHERE email='trainer@projectlens.com';`);
const browser = await chromium.launch({ headless: true });
const contexts = [];
let currentPage;
let submissionId;
async function pageFor() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().includes("401") &&
      !m.text().includes("403")
    )
      errors.push(m.text());
  });
  return page;
}
async function login(page, email, password = "ProjectLens123!") {
  await page.goto(app + "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/(trainer|pod)\/dashboard$/);
  await expect(page.locator(".loading-panel")).toHaveCount(0);
}
async function token(page) {
  return page.evaluate(
    () => JSON.parse(sessionStorage.getItem("projectlens.session")).token,
  );
}
async function api(page, path, method = "GET", body) {
  return page.request.fetch(app + path, {
    method,
    headers: { Authorization: "Bearer " + (await token(page)) },
    ...(body ? { data: body } : {}),
  });
}
async function submitForm(page, objectives, revision = false) {
  await page.getByLabel("Project title").fill(title);
  await page
    .getByLabel("Problem statement")
    .fill(
      "Engineering mentors spend hours reviewing student code. An AI code reviewer evaluates repository changes, identifies code issues and suggests focused improvements.",
    );
  await page.getByLabel("Objectives").fill(objectives);
  await page.getByLabel("Technology stack").click();
  for (const name of ["Angular", "Spring Boot", "MySQL", "TypeScript"]) {
    await page.getByLabel("Search technologies").fill(name);
    const option = page
      .locator(".tech-option")
      .filter({ hasText: name })
      .first();
    if ((await option.getAttribute("aria-pressed")) !== "true")
      await option.click();
  }
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByLabel("Supporting documentation link")
    .fill("https://example.com/projectlens/test-design");
  await page
    .getByRole("button", {
      name: revision ? "Resubmit for evaluation" : "Submit & evaluate",
    })
    .click();
  await expect(page).toHaveURL(/\/submissions\/\d+$/);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}
async function review(page, choice, comments) {
  await page.goto(app + "/reviews/" + submissionId);
  await page.getByLabel("Trainer comments").fill(comments);
  await page.getByRole("button", { name: choice, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirm decision" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".decision-history").first()).toContainText(
    comments,
  );
}
try {
  const lead = await pageFor();
  currentPage = lead;
  await lead.goto(app + "/pod/dashboard");
  await expect(lead).toHaveURL(/\/login$/);
  pass("Unauthenticated deep link redirects to login");
  await lead.getByLabel("Email address").fill(leadEmail);
  await lead.getByLabel("Password", { exact: true }).fill("wrong");
  await lead.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(lead.getByRole("alert")).toContainText(
    "Invalid email or password",
  );
  pass("Invalid login displays a generic error");
  await login(lead, leadEmail);
  await expect(
    lead.getByRole("link", { name: "Submit an idea", exact: true }).first(),
  ).toBeVisible();
  pass("Pod Lead JWT login and empty state");
  await lead
    .getByRole("link", { name: "Submit an idea", exact: true })
    .first()
    .click();
  await lead.getByRole("button", { name: "Submit & evaluate" }).click();
  await expect(
    lead.getByText("Enter a project title of 3–150 characters."),
  ).toBeVisible();
  pass("Angular required-field validation prevents submission");
  const description = lead.getByLabel("Problem statement");
  assert.equal(await description.getAttribute("maxlength"), "1000");
  await description.fill("x".repeat(1000));
  await expect(description.locator("..").locator(".character-counter")).toHaveText("1000 / 1000");
  await description.press("End");
  await description.press("x");
  assert.equal((await description.inputValue()).length, 1000);
  pass(
    "Live character counter and browser maxlength enforce the 1000-character limit",
  );
  const objectives = lead.getByLabel("Objectives");
  assert.equal(await objectives.getAttribute("maxlength"), "1000");
  await objectives.fill("x".repeat(1000));
  await expect(objectives.locator("..").locator(".character-counter")).toHaveText("1000 / 1000");
  await objectives.press("End");
  await objectives.press("x");
  assert.equal((await objectives.inputValue()).length, 1000);
  pass("Objectives live counter and browser maxlength enforce the 1000-character limit");
  await lead.getByLabel("Technology stack").click();
  for (const category of ["Frontend", "Backend", "Database"])
    await expect(
      lead
        .locator(".tech-group h4")
        .filter({ hasText: new RegExp("^" + category + "$") }),
    ).toBeVisible();
  await lead.getByLabel("Search technologies").fill("Docker");
  await lead.getByRole("button", { name: "Docker", exact: true }).click();
  await expect(lead.locator(".tech-option.selected")).toHaveCount(1);
  await lead.getByRole("button", { name: "Done", exact: true }).click();
  await lead
    .getByRole("button", { name: "Remove Docker", exact: true })
    .click();
  await expect(
    lead.getByRole("button", { name: "Remove Docker", exact: true }),
  ).toHaveCount(0);
  pass(
    "Searchable grouped multi-select supports selection indicators and removable chips",
  );
  await submitForm(
    lead,
    "Help mentors review repository changes and guide student improvements.",
  );
  submissionId = Number(lead.url().split("/").pop());
  await expect(lead.locator(".detail-heading .badge")).toContainText(
    "Needs Improvement",
  );
  pass("Low-score idea is persisted and returned for improvement");
  let structured = await (
    await api(lead, "/api/submissions/" + submissionId)
  ).json();
  assert.deepEqual(
    structured.technologyStack.map((t) => t.category),
    ["FRONTEND", "BACKEND", "DATABASE", "LANGUAGE"],
  );
  assert.equal(structured.evaluation.source, "RULE_BASED");
  await lead.reload();
  await expect(lead.locator(".details-meta .technology-chip")).toHaveCount(4);
  await lead.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(lead, leadEmail);
  await lead
    .getByRole("link", { name: "View evaluation", exact: true })
    .click();
  await expect(lead.locator(".details-meta .technology-chip")).toHaveCount(4);
  pass(
    "Categorized technologies and evaluation source survive refresh and logout/login",
  );
  const trainer = await pageFor();
  currentPage = trainer;
  await login(trainer, "trainer@projectlens.com");
  const reviewsBefore = await (await api(trainer, "/api/reviews")).json();
  assert(!reviewsBefore.some((s) => s.id === submissionId));
  assert.equal(
    (await api(trainer, "/api/reviews/" + submissionId)).status(),
    404,
  );
  pass("Low-score idea is absent from trainer list and inaccessible by ID");
  assert.equal((await api(lead, "/api/reviews")).status(), 403);
  pass("Pod Lead cannot access trainer endpoints");
  await lead.getByRole("link", { name: "Revise idea", exact: true }).click();
  await expect(
    lead.locator(".selected-technologies .technology-chip"),
  ).toHaveCount(4);
  await submitForm(
    lead,
    "Angular Spring Boot REST API MySQL authentication AI analytics",
    true,
  );
  await expect(lead.locator(".alignment-number")).toHaveText("70%");
  await expect(lead.locator(".detail-heading .badge")).toContainText(
    "Pending Review",
  );
  pass("Revision retains submission ID and exactly 70% qualifies");
  structured = await (
    await api(lead, "/api/submissions/" + submissionId)
  ).json();
  assert.equal(structured.technologyStack.length, 4);
  pass("Editing and resubmission retain structured technology categories");
  await trainer.goto(app + "/trainer/submissions");
  await trainer.getByLabel("Search projects or pods").fill(title);
  await expect(trainer.locator("tbody tr")).toHaveCount(1);
  await trainer.getByLabel("Filter by pod").selectOption(`Test Pod ${suffix}`);
  await trainer
    .getByLabel("Filter by decision status")
    .selectOption("PENDING_REVIEW");
  await trainer.getByLabel("Minimum alignment score").selectOption("80");
  await expect(
    trainer.getByRole("heading", { name: "No ideas match these filters" }),
  ).toBeVisible();
  await trainer.getByRole("button", { name: "Clear filters" }).first().click();
  await trainer.getByLabel("Sort submissions").selectOption("score-asc");
  const scores = await trainer.locator(".table-score strong").allTextContents();
  assert.deepEqual(
    scores.map((x) => parseFloat(x)),
    scores.map((x) => parseFloat(x)).sort((a, b) => a - b),
  );
  pass(
    "Search, pod/status/score filtering, empty state and score sorting use real data",
  );
  await review(
    trainer,
    "Request revision",
    "Please include measurable code accuracy targets and automated tests.",
  );
  pass("Trainer requests revision with persisted comments and confirmation");
  const member = await pageFor();
  currentPage = member;
  await login(member, memberEmail);
  await member
    .getByRole("link", { name: "View evaluation", exact: true })
    .click();
  await expect(member.locator(".feedback-panel")).toContainText(
    "measurable code accuracy",
  );
  await expect(
    member.getByRole("button", { name: "Approve idea" }),
  ).toHaveCount(0);
  await expect(
    member.getByRole("link", { name: "Revise & resubmit" }),
  ).toHaveCount(0);
  assert.equal(
    (await api(member, "/api/submissions/" + submissionId, "PUT", {})).status(),
    403,
  );
  pass("Pod Member sees trainer feedback and cannot modify or decide");
  await member.goto(app + "/pod/new");
  await expect(member).toHaveURL(/\/pod\/dashboard$/);
  await member.goto(app + "/trainer/dashboard");
  await expect(member).toHaveURL(/\/pod\/dashboard$/);
  pass("Angular role guards block member submission and trainer routes");
  currentPage = lead;
  await lead.goto(app + "/submissions/" + submissionId);
  await lead.getByRole("link", { name: "Revise & resubmit" }).first().click();
  await submitForm(
    lead,
    "Provide automated analysis of code, authentication for mentors, analytics on recurring issues, validation of repositories and JUnit tests. Include architecture documentation and REST API integration. Angular Spring Boot MySQL.",
    true,
  );
  await expect(lead.locator(".alignment-number")).toHaveText("100%");
  await expect(lead.locator(".overlap-summary")).toContainText("High overlap");
  pass(
    "Revision re-evaluates at 100% and detects high similarity to another pod",
  );
  currentPage = trainer;
  await review(
    trainer,
    "Reject proposal",
    "Differentiate the idea from the existing repository reviewer.",
  );
  pass("Trainer rejection is stored and shared");
  currentPage = lead;
  await lead.goto(app + "/submissions/" + submissionId);
  await lead.getByRole("link", { name: "Revise & resubmit" }).first().click();
  await submitForm(
    lead,
    "Angular Spring Boot REST API MySQL authentication AI analytics validation JUnit tests architecture documentation. Focus on rubric-based mentoring and measurable student learning outcomes.",
    true,
  );
  currentPage = trainer;
  await review(
    trainer,
    "Approve idea",
    "Approved after the clearer learning outcomes and revised scope.",
  );
  pass("Trainer approval completes the review workflow");
  currentPage = member;
  await member.goto(app + "/submissions/" + submissionId);
  await member.getByRole("tab", { name: /Decision history/ }).click();
  await expect(member.locator(".decision-history")).toHaveCount(3);
  await expect(member.locator(".decision-history").first()).toContainText(
    "Approved after",
  );
  pass("Read-only member view retains all three trainer decisions");
  await member.goto(app + "/notifications");
  await expect(member.locator(".notification-item")).toHaveCount(7);
  await member
    .locator(".notification-item")
    .first()
    .getByRole("button")
    .click();
  await expect(member.locator(".notification-item").first()).not.toHaveClass(
    /unread/,
  );
  pass("Database-backed notifications and mark-read behavior");
  await member.goto(app + "/criteria");
  await expect(member.locator(".rubric-entry")).toHaveCount(10);
  await expect(member.getByText("Read-only", { exact: true })).toBeVisible();
  pass("Cohort criteria are read-only and API-backed");
  await member.goto(app + "/profile");
  await expect(member.locator(".profile-panel")).toContainText(memberEmail);
  pass("Profile loads authenticated identity from the API");
  await member.setViewportSize({ width: 390, height: 844 });
  await member.goto(app + "/submissions/" + submissionId);
  assert(
    await member.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await member.screenshot({
    path: join(evidenceDir, "member-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await member.getByRole("button", { name: "Open navigation" }).click();
  await expect(member.locator(".sidebar")).toHaveClass(/open/);
  await member
    .getByRole("navigation")
    .getByRole("link", { name: "Notifications" })
    .click();
  await expect(member).toHaveURL(/\/notifications$/);
  pass("Mobile layout fits viewport and mobile navigation works");
  await member.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(member).toHaveURL(/\/login$/);
  assert.equal(
    await member.evaluate(() => sessionStorage.getItem("projectlens.session")),
    null,
  );
  await member.goto(app + "/submissions/" + submissionId);
  await expect(member).toHaveURL(/\/login$/);
  pass("Logout clears session and blocks protected navigation");
  const persisted = sql(
    `SELECT status FROM project_submissions WHERE id=${submissionId}; SELECT COUNT(*) FROM trainer_decisions WHERE submission_id=${submissionId};`,
  );
  assert.equal(persisted, "APPROVED\n3");
  pass("Real MySQL persists final approval and complete decision history");
  await trainer.goto(app + "/trainer/dashboard");
  await trainer.screenshot({
    path: join(evidenceDir, "trainer-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  pass("No unexpected browser console errors or uncaught exceptions");
} catch (error) {
  if (currentPage)
    await currentPage
      .screenshot({ path: join(evidenceDir, "failure.png"), fullPage: true })
      .catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  sql(`SET @pod=(SELECT id FROM pods WHERE name='Test Pod ${suffix}'); SET @s=(SELECT id FROM project_submissions WHERE pod_id=@pod); SET @e=(SELECT id FROM submission_evaluations WHERE submission_id=@s);
 DELETE FROM notifications WHERE submission_id=@s OR user_id IN (SELECT id FROM app_users WHERE pod_id=@pod);
 DELETE FROM trainer_decisions WHERE submission_id=@s; DELETE FROM evaluation_matched WHERE evaluation_id=@e; DELETE FROM evaluation_missing WHERE evaluation_id=@e; DELETE FROM evaluation_shared_terms WHERE evaluation_id=@e;
 DELETE FROM submission_evaluations WHERE id=@e; DELETE FROM submission_technologies WHERE submission_id=@s; DELETE FROM project_submissions WHERE id=@s; DELETE FROM app_users WHERE pod_id=@pod; DELETE FROM pods WHERE id=@pod;`);
  writeFileSync(
    join(evidenceDir, "results.json"),
    JSON.stringify(
      {
        passed: checks.length,
        checks,
        browserErrors: errors,
        success: !process.exitCode,
        fixturesCleaned: true,
      },
      null,
      2,
    ),
  );
  console.log(
    `${checks.length} end-to-end checks passed. Temporary test fixtures removed.`,
  );
}
