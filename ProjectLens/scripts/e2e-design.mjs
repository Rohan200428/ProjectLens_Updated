import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { chromium, expect } = createRequire(join(root, 'frontend/package.json'))('@playwright/test');
const base = 'http://127.0.0.1:4200';
const evidence = join(root, 'work/redesign');
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [];
let success = false;

async function fits(page, description) {
  const measure = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(measure.document <= measure.viewport, `${description}: ${JSON.stringify(measure)}`);
  checks.push(description);
}
async function screenshot(page, name) {
  for (const score of await page.locator('.animated-score').all()) {
    const actual = parseFloat(await score.getAttribute('aria-label'));
    await expect.poll(async () => parseFloat(await score.locator('.alignment-number').textContent())).toBe(actual);
  }
  for (const metric of await page.locator('pl-metric .metric-value').all()) {
    const actual = parseFloat(await metric.getAttribute('aria-label'));
    await expect.poll(async () => parseFloat(await metric.textContent())).toBe(actual);
  }
  // Visit the full document so one-time viewport reveals appear in full-page evidence.
  await page.evaluate(async () => {
    for (let top = 0; top < document.documentElement.scrollHeight; top += innerHeight * .8) {
      window.scrollTo({ top, behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: join(root, 'outputs', name + '.png'), fullPage: true, animations: 'disabled' });
}
async function auditRole(role, email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${role}: ${error.message}`));
  try {
    const auth = await context.request.post(base + '/api/auth/login', { data: { email, password: 'ProjectLens123!' } });
    assert.equal(auth.status(), 200);
    const session = await auth.json();
    await page.addInitScript(value => sessionStorage.setItem('projectlens.session', JSON.stringify(value)), session);
    const trainer = role === 'trainer';
    const dashboard = await context.request.get(base + '/api/dashboard/' + (trainer ? 'trainer' : 'pod'), { headers: { Authorization: 'Bearer ' + session.token } });
    assert.equal(dashboard.status(), 200);
    const data = await dashboard.json();
    const paths = trainer ? ['/trainer/dashboard', '/trainer/submissions', '/trainer/reviews'] : ['/pod/dashboard', '/pod/submissions'];
    paths.push('/criteria', '/notifications', '/profile');
    if (data.submissions.length) {
      const id = data.submissions[0].id;
      paths.push('/submissions/' + id);
      if (trainer) paths.push('/reviews/' + id);
      if (role === 'lead' && ['NEEDS_IMPROVEMENT', 'NEEDS_REVISION'].includes(data.submissions[0].status)) paths.push(`/pod/submissions/${id}/edit`);
    } else if (role === 'fresh-lead') paths.push('/pod/new');
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const path of paths) {
          await page.goto(base + path);
          await expect(page.locator('.main-content h1')).toBeVisible();
          await expect(page.locator('pl-skeleton')).toHaveCount(0);
          assert.equal(new URL(page.url()).pathname, path, `Unexpected redirect: ${role} ${path}`);
          await fits(page, `${role} ${path} ${width}px ${colorScheme}`);
          if (width === 1440 && colorScheme === 'light') {
            const names = { '/trainer/dashboard': 'trainer-dashboard', '/trainer/submissions': 'trainer-submissions', '/trainer/reviews': 'trainer-queue', '/criteria': 'criteria', '/notifications': 'notifications', '/profile': 'profile', '/pod/new': 'submission-form', '/pod/dashboard': role === 'fresh-lead' ? 'pod-empty' : role + '-dashboard' };
            if (names[path] && (trainer || path.startsWith('/pod'))) await screenshot(page, names[path]);
          }
          if (trainer && path === '/trainer/dashboard' && width === 1440 && colorScheme === 'dark') await screenshot(page, 'trainer-dark');
          if (trainer && path === '/trainer/dashboard' && width === 390 && colorScheme === 'light') await screenshot(page, 'trainer-mobile');
          if (role === 'fresh-lead' && path === '/pod/new' && width === 390 && colorScheme === 'light') await screenshot(page, 'submission-mobile');
          if (trainer && path.startsWith('/reviews/') && width === 1440 && colorScheme === 'light') await screenshot(page, 'trainer-review');
          if (role === 'lead' && path.startsWith('/submissions/') && width === 1440 && colorScheme === 'light') {
            const tabs = page.getByRole('tab');
            await tabs.first().focus();
            await page.keyboard.press('ArrowRight');
            await expect(tabs.nth(1)).toBeFocused();
            await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
            await page.keyboard.press('End');
            await expect(tabs.last()).toBeFocused();
            await page.keyboard.press('Home');
            await expect(tabs.first()).toBeFocused();
            checks.push('Evidence tabs: ArrowRight, End and Home move focus and select the panel');
          }
          if (role === 'fresh-lead' && path === '/pod/new' && width === 320 && colorScheme === 'light') {
            const objectives = page.getByLabel('Objectives');
            await objectives.fill('x'.repeat(1000));
            assert.equal((await objectives.inputValue()).length, 1000);
            await expect(objectives).toHaveAttribute('maxlength', '1000');
            await expect(page.locator('.character-counter').last()).toHaveText('1000 / 1000');
            const menu = page.getByRole('button', { name: 'Open navigation' });
            await menu.click();
            await expect(menu).toHaveAttribute('aria-expanded', 'true');
            await page.locator('.sidebar nav a').first().click();
            await expect(menu).toHaveAttribute('aria-expanded', 'false');
            checks.push('320px creation form retains 1,000-character Objectives limit and drawer state');
          }
        }
      }
      console.log(`PASS ${role}: ${paths.length} routes, five widths, ${colorScheme}`);
    }
  } catch (error) {
    await page.screenshot({ path: join(evidence, role + '-failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
try {
  const results = await Promise.allSettled([
    auditRole('trainer', 'trainer@projectlens.com'),
    auditRole('lead', 'lead1@projectlens.com'),
    auditRole('member', 'member1@projectlens.com'),
    auditRole('fresh-lead', 'lead6@projectlens.com'),
  ]);
  for (const result of results) if (result.status === 'rejected') throw result.reason;
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  for (const colorScheme of ['light', 'dark']) for (const width of [1440, 1024, 768, 390, 320]) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + '/login');
    await expect(page.getByRole('button', { name: 'Sign in to workspace' })).toBeVisible();
    await fits(page, `login ${width}px ${colorScheme}`);
    if (width === 1440 && colorScheme === 'light') await screenshot(page, 'login');
    if (width === 390 && colorScheme === 'light') await screenshot(page, 'login-mobile');
  }
  assert.deepEqual(errors, []);
  success = true;
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
  await browser.close();
  writeFileSync(join(evidence, 'route-audit.json'), JSON.stringify({ success, passed: checks.length, checks, browserErrors: errors }, null, 2));
  console.log(`${checks.length} design checks passed.`);
}
