import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { chromium, expect } = createRequire(join(root, 'frontend/package.json'))('@playwright/test');
// Playwright hides native scrollbars by default; expose them to exercise the reported bug.
const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--disable-features=OverlayScrollbar'] });
const checks = [], browserErrors = [];
let success = false;
try {
  for (const [width, colorScheme] of [[1440, 'light'], [714, 'dark'], [390, 'light']]) {
    const context = await browser.newContext({ viewport: { width, height: 764 }, colorScheme, reducedMotion: 'reduce' });
    try {
      const auth = await context.request.post('http://127.0.0.1:4200/api/auth/login', { data: { email: 'lead1@projectlens.com', password: 'ProjectLens123!' } });
      assert.equal(auth.status(), 200);
      await context.addInitScript(session => sessionStorage.setItem('projectlens.session', JSON.stringify(session)), await auth.json());
      const page = await context.newPage();
      page.on('pageerror', error => browserErrors.push(error.message));
      await page.goto('http://127.0.0.1:4200/pod/submissions/1/edit');
      await expect(page.locator('pl-skeleton')).toHaveCount(0);
      await expect(page.locator('.proposal-outline h3')).toHaveText('Give your idea a clear direction.');
      const trigger = page.locator('#technologyStack');
      const options = page.locator('.tech-options');
      const search = page.getByRole('textbox', { name: 'Search technologies' });
      const open = async () => {
        await trigger.click();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await options.scrollIntoViewIfNeeded();
        await search.focus();
      };
      await open();
      const geometry = await options.evaluate(e => ({ gutter: e.offsetWidth - e.clientWidth, height: e.clientHeight, scrollHeight: e.scrollHeight }));
      assert(geometry.gutter > 0 && geometry.scrollHeight > geometry.height, 'Native scrollbar must be present');
      let rect = await options.boundingBox();
      const scrollbarX = rect.x + rect.width - geometry.gutter / 2;
      await page.mouse.click(scrollbarX, rect.y + rect.height - 25);
      await expect.poll(() => options.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(options).toBeFocused();
      checks.push(`${width}px ${colorScheme}: scrollbar track scrolls and keeps dropdown open`);

      await options.focus();
      await page.keyboard.press('Home');
      await expect.poll(() => options.evaluate(e => e.scrollTop)).toBe(0);
      await search.focus();
      rect = await options.boundingBox();
      const thumbCenter = 16 + Math.max(18, (geometry.height - 32) * geometry.height / geometry.scrollHeight) / 2;
      await page.mouse.move(scrollbarX, rect.y + thumbCenter);
      await page.mouse.down();
      await page.mouse.move(scrollbarX, rect.y + 180, { steps: 12 });
      await page.mouse.up();
      await expect.poll(() => options.evaluate(e => e.scrollTop)).toBeGreaterThan(100);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      checks.push(`${width}px ${colorScheme}: scrollbar thumb drags without dismissing picker`);

      await options.focus();
      await page.keyboard.press('Home');
      await expect.poll(() => options.evaluate(e => e.scrollTop)).toBe(0);
      await page.mouse.move(rect.x + 40, rect.y + 100);
      await page.mouse.wheel(0, 420);
      await expect.poll(() => options.evaluate(e => e.scrollTop)).toBeGreaterThan(100);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await options.focus();
      const before = await options.evaluate(e => e.scrollTop);
      await page.keyboard.press('PageDown');
      await expect.poll(() => options.evaluate(e => e.scrollTop)).toBeGreaterThan(before);
      checks.push(`${width}px ${colorScheme}: wheel and keyboard scrolling remain available`);

      await search.fill('React');
      const option = page.getByRole('button', { name: 'React', exact: true });
      const selected = await option.getAttribute('aria-pressed');
      await option.click();
      await expect(option).toHaveAttribute('aria-pressed', selected === 'true' ? 'false' : 'true');
      await option.click();
      await expect(option).toHaveAttribute('aria-pressed', selected);
      await search.focus();
      await page.keyboard.press('Escape');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
      await open();
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await open();
      await page.locator('#documentationLink').focus();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await open();
      await page.locator('.main-content h1').click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      checks.push(`${width}px ${colorScheme}: selection, Escape, Done and outside focus/click retain expected behavior`);
    } finally { await context.close(); }
  }
  assert.deepEqual(browserErrors, []);
  success = true;
} finally {
  await browser.close();
  mkdirSync(join(root, 'work/selector'), { recursive: true });
  writeFileSync(join(root, 'work/selector/results.json'), JSON.stringify({ success, passed: checks.length, checks, browserErrors }, null, 2));
}
checks.forEach(check => console.log('PASS ' + check));
console.log(`${checks.length} selector regression checks passed. No submissions saved.`);
