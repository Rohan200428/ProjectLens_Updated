import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { chromium, expect } = createRequire(join(root, "frontend/package.json"))(
  "@playwright/test",
);
const base = "http://127.0.0.1:4200";
const checks = [];
const errors = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
async function captureScreenshot(options) {
  const scores = page.locator(".animated-score");
  for (let index = 0; index < await scores.count(); index++) {
    const score = scores.nth(index);
    const actual = parseFloat(await score.getAttribute("aria-label"));
    await expect.poll(async () => parseFloat(await score.locator(".alignment-number").textContent())).toBe(actual);
  }
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.evaluate(async () => {
    for (let top = 0; top < document.documentElement.scrollHeight; top += innerHeight * .8) {
      window.scrollTo({ top, behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return page.screenshot(options);
}
page.on("pageerror", (e) => errors.push(e.message));
const evidence = join(root, "work/ux");
mkdirSync(evidence, { recursive: true });
function pass(s) {
  checks.push(s);
  console.log("PASS " + s);
}
async function login(email) {
  if (page.url().startsWith(base))
    await page.evaluate(() => sessionStorage.removeItem("projectlens.session"));
  await page.goto(base + "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("ProjectLens123!");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await expect(page.locator("pl-skeleton")).toHaveCount(0);
}
async function ready(path) {
  await page.goto(base + path);
  await expect(page.locator("pl-skeleton")).toHaveCount(0);
  await expect(page.locator(".main-content h1")).toBeVisible();
}
async function fits() {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    page.url() + " overflows",
  );
}
let success = false;
const fixtureSuffix = randomUUID().slice(0, 8);
const fixturePod = `UI Review ${fixtureSuffix}`;
const fixtureLead = `ui-review-${fixtureSuffix}@projectlens.com`;
const fixtureFreshPod = `UI Draft ${fixtureSuffix}`;
const fixtureFreshLead = `ui-draft-${fixtureSuffix}@projectlens.com`;
const localConfig = JSON.parse(readFileSync(join(root, "work/local-config.json"), "utf8").replace(/^\uFEFF/, ""));
function fixtureSql(query) {
  const result = spawnSync(join(localConfig.mysqlBin, "mysql.exe"),
    ["--no-defaults", "--host=127.0.0.1", `--port=${localConfig.port}`, `--user=${localConfig.dbUsername}`, "--batch", "--skip-column-names", "projectlens_db"],
    { input: query, encoding: "utf8", env: { ...process.env, MYSQL_PWD: localConfig.dbPassword } });
  if (result.status !== 0) throw new Error("UI fixture database operation failed.");
}
async function prepareFixtures() {
  for (const [pod, email] of [[fixturePod, fixtureLead], [fixtureFreshPod, fixtureFreshLead]]) {
    fixtureSql(`INSERT INTO pods(name,created_at,updated_at) VALUES ('${pod}',UTC_TIMESTAMP(),UTC_TIMESTAMP()); SET @pod=LAST_INSERT_ID();
    INSERT INTO app_users(name,email,password,role,pod_id,created_at,updated_at) SELECT 'UI Verification Lead','${email}',password,'POD_LEAD',@pod,UTC_TIMESTAMP(),UTC_TIMESTAMP() FROM app_users WHERE email='trainer@projectlens.com';`);
  }
  const auth = await context.request.post(base + "/api/auth/login", { data: { email: fixtureLead, password: "ProjectLens123!" } });
  assert.equal(auth.status(), 200);
  const session = await auth.json();
  const created = await context.request.post(base + "/api/submissions", {
    headers: { Authorization: "Bearer " + session.token },
    data: {
      projectTitle: "Proposal review verification",
      problemStatement: "Engineering mentors need a secure workspace to review repository changes and guide student projects.",
      objectives: "Angular Spring Boot REST API MySQL authentication AI analytics validation JUnit tests architecture documentation",
      technologyStack: [{ name: "Angular", category: "FRONTEND" }, { name: "Spring Boot", category: "BACKEND" }, { name: "MySQL", category: "DATABASE" }],
      documentationLink: "https://example.com/ui-verification"
    }
  });
  assert.equal(created.status(), 201);
}
function cleanFixtures() {
  for (const pod of [fixturePod, fixtureFreshPod]) {
    fixtureSql(`SET @pod=(SELECT id FROM pods WHERE name='${pod}'); SET @s=(SELECT id FROM project_submissions WHERE pod_id=@pod); SET @e=(SELECT id FROM submission_evaluations WHERE submission_id=@s);
    DELETE FROM notifications WHERE submission_id=@s OR user_id IN (SELECT id FROM app_users WHERE pod_id=@pod);
    DELETE FROM trainer_decisions WHERE submission_id=@s; DELETE FROM evaluation_matched WHERE evaluation_id=@e; DELETE FROM evaluation_missing WHERE evaluation_id=@e; DELETE FROM evaluation_shared_terms WHERE evaluation_id=@e;
    DELETE FROM submission_evaluations WHERE id=@e; DELETE FROM submission_technologies WHERE submission_id=@s; DELETE FROM project_submissions WHERE id=@s; DELETE FROM app_users WHERE pod_id=@pod; DELETE FROM pods WHERE id=@pod;`);
  }
}
try {
  await prepareFixtures();
  await login("trainer@projectlens.com");
  await expect(page.locator(".cohort-hero")).toBeVisible();
  await expect(page.locator(".alignment-overview")).toBeVisible();
  await expect(page.locator(".review-queue")).toBeVisible();
  await expect(page.locator(".overlap-alerts")).toBeVisible();
  await captureScreenshot({
    path: join(root, "outputs/trainer-dashboard.png"),
    fullPage: true,
    animations: "disabled",
  });
  pass(
    "Trainer dashboard includes live alignment distribution, decision snapshot, review queue and overlap alerts",
  );
  for (const path of [
    "/trainer/dashboard",
    "/trainer/submissions",
    "/trainer/reviews",
    "/criteria",
    "/notifications",
    "/profile",
  ]) {
    await ready(path);
    await fits();
  }
  pass("All major trainer routes render with live API data");
  await ready("/trainer/dashboard");
  await page.locator(".queue-item").first().click();
  await expect(page.locator(".detail-heading")).toBeVisible();
  await expect(page.locator(".decision-panel")).toBeVisible();
  for (const tab of [
    "Project proposal",
    "Decision history",
    "Criteria analysis",
  ]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await expect(page.locator("[role=tabpanel]")).toBeVisible();
  }
  await page
    .getByLabel("Trainer comments")
    .fill("Keyboard accessibility check only.");
  await page.getByRole("button", { name: "Approve idea" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    "Confirm decision",
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    "Cancel",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await captureScreenshot({
    path: join(root, "outputs/trainer-review.png"),
    fullPage: true,
    animations: "disabled",
  });
  pass(
    "Review tabs, confirmation dialog focus trap and Escape cancellation work without writing a decision",
  );
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/trainer/dashboard",
      "/trainer/submissions",
      "/trainer/reviews",
      "/criteria",
      "/notifications",
      "/profile",
    ]) {
      await ready(path);
      await fits();
    }
  }
  await ready("/trainer/dashboard");
  await captureScreenshot({
    path: join(root, "outputs/trainer-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  pass(
    "Trainer pages adapt without horizontal overflow at desktop, laptop, tablet and mobile widths",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/dashboard/trainer", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  await page.goto(base + "/trainer/dashboard");
  await expect(page.locator("pl-skeleton")).toBeVisible();
  await expect(page.locator("pl-skeleton")).toHaveCount(0);
  await page.unroute("**/api/dashboard/trainer");
  pass("API loading displays skeletons and recovers to real dashboard data");
  await page.route("**/api/dashboard/trainer", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Temporary service interruption. Please try again.",
      }),
    }),
  );
  await page.goto(base + "/trainer/dashboard");
  await expect(page.getByRole("alert")).toContainText(
    "Temporary service interruption",
  );
  await page.unroute("**/api/dashboard/trainer");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".cohort-hero")).toBeVisible();
  pass("API failure presents a recovery action that reloads the dashboard");
  await page.route("**/api/notifications", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await ready("/notifications");
  await expect(
    page.getByRole("heading", { name: "You’re all caught up." }),
  ).toBeVisible();
  await page.unroute("**/api/notifications");
  pass("Notification empty state renders a useful explanation");
  await page.route("**/api/dashboard/trainer", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Session expired" }),
    }),
  );
  await page.goto(base + "/trainer/dashboard");
  await expect(page).toHaveURL(/login\?reason=expired$/);
  await expect(page.locator(".session-notice")).toContainText(
    "Your session expired",
  );
  assert.equal(
    await page.evaluate(() => sessionStorage.getItem("projectlens.session")),
    null,
  );
  await page.unroute("**/api/dashboard/trainer");
  pass(
    "Expired sessions clear credentials and explain how to recover on the login page",
  );
  await login(fixtureFreshLead);
  await page
    .getByRole("link", { name: "Submit an idea", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Project title")).toBeVisible();
  await expect(page.locator(".draft-preview")).toBeVisible();
  await page.getByLabel("Project title").fill("Draft preview check");
  await page
    .getByLabel("Problem statement")
    .fill(
      "A full-stack enterprise portal with Angular and secure authentication.",
    );
  await expect(page.locator(".draft-completion strong")).toHaveText("40%");
  assert(
    (await page.locator(".draft-score").textContent()) !== "0/ 10 criteria",
  );
  await page.getByLabel("Technology stack").click();
  await page.getByLabel("Search technologies").fill("Angular");
  await page.getByRole("button", { name: "Angular", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByLabel("Technology stack").click();
  await expect(page.locator(".tech-option.selected")).toHaveCount(1);
  await page.getByRole("button", { name: "Angular", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.locator(".selected-technologies .technology-chip"),
  ).toHaveCount(0);
  await page.getByLabel("Technology stack").click();
  await page.getByLabel("Search technologies").fill("Spring");
  await captureScreenshot({
    path: join(root, "outputs/submission-form.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  pass(
    "Live draft coverage and completion update; selected technologies toggle without duplicates",
  );
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await fits();
  }
  await captureScreenshot({
    path: join(root, "outputs/submission-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  pass(
    "Submission form and technology selector fit desktop through mobile layouts",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login("lead1@projectlens.com");
  await page
    .getByRole("link", { name: "View evaluation", exact: true })
    .click();
  await expect(page.locator(".scoring-note")).toContainText(
    "ProjectLens Rule Engine",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("pl-skeleton")).toHaveCount(0);
  const styles = await page
    .locator(".main-content>pl-detail")
    .evaluate((e) => ({
      animation: getComputedStyle(e).animationDuration,
      transition: getComputedStyle(e).transitionDuration,
    }));
  assert.equal(styles.animation, "1e-05s");
  await expect(page.locator(".alignment-number")).toHaveText("20%");
  pass(
    "Reduced motion removes nonessential movement and renders the final score directly",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.__scoreSamples = [];
    new MutationObserver(() =>
      document.querySelectorAll(".alignment-number").forEach((e) => {
        const n = parseFloat(e.textContent);
        if (Number.isFinite(n)) window.__scoreSamples.push(n);
      }),
    ).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  await page.reload();
  await expect(page.locator(".alignment-number")).toHaveText("20%");
  assert(
    await page.evaluate(() =>
      window.__scoreSamples.some((n) => n > 0 && n < 20),
    ),
  );
  pass(
    "Alignment score animates through intermediate values to the actual persisted result",
  );
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await fits();
  }
  await captureScreenshot({
    path: join(root, "outputs/pod-evaluation-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await fits();
  await captureScreenshot({
    path: join(root, "outputs/login-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  pass("Pod evaluation and login provide mobile layouts without overflow");
  assert.deepEqual(errors, []);
  pass(
    "No uncaught browser exceptions across route, loading, error, empty and motion checks",
  );
  success = true;
} catch (e) {
  console.error(e);
  await page
    .screenshot({ path: join(evidence, "failure.png"), fullPage: true })
    .catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  cleanFixtures();
  writeFileSync(
    join(evidence, "results.json"),
    JSON.stringify(
      { success, passed: checks.length, checks, browserErrors: errors, fixturesCleaned: true },
      null,
      2,
    ),
  );
  console.log(checks.length + " UI verification checks passed.");
}
