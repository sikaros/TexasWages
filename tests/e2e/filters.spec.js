// Polish pass — the always-visible filter bar (major-group dropdown, min-median-wage
// field, Reset button) and the data-vintage / provenance indicators.
//
// The filter controls change the *store* (source of truth), so we drive them through
// the live Ext components and assert on store contents rather than the buffered DOM.
// The number field's change listener is buffered, so we poll with waitForFunction.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

function waitForStoreCount(page, n) {
  return page.waitForFunction((expected) => {
    const g = window.Ext && Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
    const s = g && g.getStore();
    return !!s && s.getCount() === expected;
  }, n, { timeout: H.WAIT_TIMEOUT });
}

function setMajorGroup(page, code) {
  return page.evaluate((c) => {
    Ext.ComponentQuery.query('[reference=majorGroupFilter]')[0].setValue(c);
  }, code);
}

function setMinWage(page, amount) {
  return page.evaluate((a) => {
    Ext.ComponentQuery.query('[reference=minWageFilter]')[0].setValue(a);
  }, amount);
}

function storeField(page, field) {
  return page.evaluate((f) => {
    const s = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0].getStore();
    const out = [];
    s.each((r) => out.push(r.get(f)));
    return out;
  }, field);
}

test.describe('filter bar', () => {
  test.beforeEach(async ({ page }) => {
    await H.openApp(page);
  });

  test('the filter controls are visible on load (not buried in a column menu)', async ({ page }) => {
    await expect(page.getByTestId('major-group-filter')).toBeVisible();
    await expect(page.getByTestId('min-wage-filter')).toBeVisible();
    await expect(page.getByTestId('reset-filters')).toBeVisible();
  });

  test('the data vintage and BLS source are shown on the page', async ({ page }) => {
    await expect(page.getByTestId('data-vintage')).toContainText('May 2025');
    await expect(page.getByTestId('data-provenance')).toContainText('Bureau of Labor Statistics');
  });

  test('the major-group dropdown narrows the grid to that group', async ({ page }) => {
    await setMajorGroup(page, '15-0000'); // Computer and Mathematical Occupations
    await waitForStoreCount(page, 2);

    const codes = await storeField(page, 'majorGroupCode');
    expect(codes).toHaveLength(2);
    for (const c of codes) {
      expect(c, 'every remaining row is in the selected major group').toBe('15-0000');
    }
  });

  test('the min-median-wage field drops rows below the threshold', async ({ page }) => {
    await setMinWage(page, 100000);
    await waitForStoreCount(page, 5); // 5 sample rows have aMedian >= 100000

    const medians = await storeField(page, 'aMedian');
    expect(medians.length).toBeGreaterThan(0);
    for (const m of medians) {
      expect(m, 'no suppressed/low-wage rows survive the min filter').not.toBeNull();
      expect(m).toBeGreaterThanOrEqual(100000);
    }
  });

  test('major-group and min-wage filters stack (AND semantics)', async ({ page }) => {
    await setMajorGroup(page, '15-0000');
    await waitForStoreCount(page, 2);
    await setMinWage(page, 110000);
    await waitForStoreCount(page, 1); // only 15-1252 (122000) clears 110k in that group

    const rec = await H.recordBySoc(page, '15-1252');
    expect(rec).not.toBeNull();
    expect(rec.aMedian).toBeGreaterThanOrEqual(110000);
  });

  test('Reset clears the search, both knobs, and any column filters', async ({ page }) => {
    await H.typeSearch(page, 'nurse');
    await waitForStoreCount(page, 3);
    await setMajorGroup(page, '29-0000');
    await setMinWage(page, 50000);

    await page.getByTestId('reset-filters').click();
    await waitForStoreCount(page, 21);

    const state = await page.evaluate(() => ({
      combo: Ext.ComponentQuery.query('[reference=majorGroupFilter]')[0].getValue(),
      minw: Ext.ComponentQuery.query('[reference=minWageFilter]')[0].getValue(),
      search: Ext.ComponentQuery.query('[reference=searchField]')[0].getValue()
    }));
    expect(state.combo).toBeNull();
    expect(state.minw).toBeNull();
    expect(state.search === '' || state.search === null).toBeTruthy();
  });
});
