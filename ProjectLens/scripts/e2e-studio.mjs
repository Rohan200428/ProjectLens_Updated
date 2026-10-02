import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { chromium, expect } = createRequire(join(root, 'frontend/package.json'))('@playwright/test');
const base = 'http://127.0.0.1:4200';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
const page = await context.newPage();
const checks = [], errors = [];
const pass = name => { checks.push(name); console.log('PASS ' + name); };
page.on('pageerror', error => errors.push(error.message));
async function ready(path) {
  await page.goto(base + path);
  await expect(page.locator('.main-content h1')).toBeVisible();
  await expect(page.locator('pl-skeleton')).toHaveCount(0);
}
let success = false;
try {
  const auth = await context.request.post(base + '/api/auth/login', { data: { email: 'trainer@projectlens.com', password: 'ProjectLens123!' } });
  assert.equal(auth.status(), 200);
  await page.addInitScript(session => sessionStorage.setItem('projectlens.session', JSON.stringify(session)), await auth.json());
  await ready('/trainer/dashboard');
  const dock = page.getByRole('button', { name: 'Expand or collapse workspace navigation' });
  await dock.click();
  await expect(dock).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.studio-shell')).toHaveClass(/navigation-expanded/);
  await dock.click();
  await expect(dock).toHaveAttribute('aria-expanded', 'false');
  pass('Navigation dock expands and collapses with an accessible state');
  const project = page.locator('.stream-project').first();
  await project.hover();
  await expect(project.locator('.stream-reveal')).toHaveCSS('opacity', '1');
  await project.focus();
  await expect(project.locator('.stream-reveal')).toHaveCSS('opacity', '1');
  pass('Project stream reveals technology context on hover and keyboard focus');
  await ready('/trainer/submissions');
  const preview = page.getByRole('complementary', { name: 'Submission preview' });
  const second = page.locator('tbody tr').nth(1);
  const title = await second.locator('.project-title').textContent();
  await second.getByRole('button', { name: /^Preview / }).click();
  await expect(preview.locator('h2')).toHaveText(title.trim());
  await expect(second.getByRole('button', { name: /^Preview / })).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByRole('link', { name: 'Open evaluation' })).toBeVisible();
  pass('Selecting a submission updates its real preview, score, technologies and evaluation action');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator('tbody tr').first().getByRole('button', { name: /^Preview / }).click();
  await expect(preview).toBeFocused();
  await expect(preview).toBeInViewport();
  pass('Mobile preview selection moves focus and scrolls to project context');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready('/criteria');
  const rubric = page.locator('.rubric-entry').nth(1);
  await rubric.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(rubric).toHaveAttribute('open', '');
  await expect(rubric.locator('.learning-objective')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(rubric).not.toHaveAttribute('open', '');
  pass('Rubric accordion exposes real learning objectives and supports keyboard toggling');
  await page.addInitScript(() => {
    window.__metricSamples = [];
    new MutationObserver(() => document.querySelectorAll('pl-metric').forEach(element => {
      const number = parseFloat(element.textContent);
      if (Number.isFinite(number)) window.__metricSamples.push(number);
    })).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await ready('/trainer/dashboard');
  const approved = page.locator('.decision-total .metric-value');
  const value = parseFloat(await approved.getAttribute('aria-label'));
  await expect.poll(async () => parseFloat(await approved.textContent())).toBe(value);
  assert(value > 1 && await page.evaluate(target => window.__metricSamples.some(number => number > 0 && number < target), value));
  pass('Real cohort counts animate through intermediate values to the final API value');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready('/trainer/dashboard');
  await expect(page.locator('.decision-total .metric-value')).toHaveText(String(value));
  assert.equal(await page.locator('.reveal-ready').count(), 0);
  pass('Reduced motion renders counts immediately and bypasses viewport reveals');
  assert.deepEqual(errors, []);
  success = true;
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  mkdirSync(join(root, 'work/radical'), { recursive: true });
  writeFileSync(join(root, 'work/radical/studio-results.json'), JSON.stringify({ success, passed: checks.length, checks, browserErrors: errors }, null, 2));
  await browser.close();
  console.log(checks.length + ' studio interaction checks passed.');
}
