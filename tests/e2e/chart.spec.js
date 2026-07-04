// Criterion 6 — Wage percentile chart.
// Selecting Registered Nurses gives one bar per non-null annual percentile (5).
// Selecting the top-coded physician row (29-1216) still renders the chart with
// fewer bars (its median/75th/90th are null -> 2 bars) and throws no error.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

async function waitForChartBars(page, n) {
  await page.waitForFunction((expected) => {
    const c = window.Ext && Ext.ComponentQuery.query('[reference=wageChart]')[0];
    const s = c && c.getStore();
    return !!s && s.getCount() === expected;
  }, n, { timeout: H.WAIT_TIMEOUT });
}

test.describe('chart', () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = H.collectPageErrors(page);
    await H.openApp(page);
  });

  test('Registered Nurses renders 5 bars', async ({ page }) => {
    expect(await H.selectSoc(page, '29-1141')).toBeTruthy();
    await waitForChartBars(page, 5);

    expect(await H.chartBarCount(page)).toBe(5);
    await expect(page.getByTestId('wage-chart')).toBeVisible();
    expect(errors, `unexpected page errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('top-coded physician still renders with fewer bars and no error', async ({ page }) => {
    // Sanity-check the record shape that drives the "fewer bars" outcome.
    const rec = await H.recordBySoc(page, '29-1216');
    expect(rec.topCoded).toBe(true);
    expect(rec.aMedian).toBeNull();

    expect(await H.selectSoc(page, '29-1216')).toBeTruthy();
    await waitForChartBars(page, 2); // only aPct10 + aPct25 are non-null

    const bars = await H.chartBarCount(page);
    expect(bars).toBe(2);
    expect(bars).toBeGreaterThan(0);
    expect(bars).toBeLessThan(5);

    await expect(page.getByTestId('wage-chart')).toBeVisible();
    expect(errors, `unexpected page errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
