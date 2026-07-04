// Criterion 4 — Search.
// Typing "nurse" filters the store so every remaining row's title OR socCode contains
// "nurse"; typing an exact SOC ("29-1141") narrows to a single row; clearing restores
// the full count. The change listener is buffered (200ms), so we poll the store via
// waitForFunction rather than sleeping.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

async function waitForStoreCount(page, n) {
  await page.waitForFunction((expected) => {
    const g = window.Ext && Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
    const s = g && g.getStore();
    return !!s && s.getCount() === expected;
  }, n, { timeout: H.WAIT_TIMEOUT });
}

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    await H.openApp(page);
  });

  test('typing "nurse" keeps only nurse-matching rows', async ({ page }) => {
    await H.typeSearch(page, 'nurse');
    await waitForStoreCount(page, 3);

    const rows = await page.evaluate(() => {
      const s = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0].getStore();
      const out = [];
      s.each((r) => out.push({ title: r.get('title'), socCode: r.get('socCode') }));
      return out;
    });

    expect(rows).toHaveLength(3);
    for (const r of rows) {
      const hit = r.title.toLowerCase().includes('nurse') ||
                  r.socCode.toLowerCase().includes('nurse');
      expect(hit, `row "${r.title}" (${r.socCode}) should match "nurse"`).toBeTruthy();
    }
  });

  test('typing an exact SOC narrows to one row', async ({ page }) => {
    await H.typeSearch(page, '29-1141');
    await waitForStoreCount(page, 1);

    const rec = await H.recordBySoc(page, '29-1141');
    expect(rec.title).toBe('Registered Nurses');
  });

  test('clearing the search restores the full count', async ({ page }) => {
    await H.typeSearch(page, 'nurse');
    await waitForStoreCount(page, 3);

    await H.clickClearSearch(page);
    await waitForStoreCount(page, 21);
  });
});
