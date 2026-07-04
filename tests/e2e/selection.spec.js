// Criterion 5 — Selection -> detail KPIs.
// Selecting the Registered Nurses row sets kpi-median to the formatted aMedian
// ($84,320) and populates kpi-emp, kpi-mean and kpi-lq.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test.describe('selection -> KPIs', () => {
  test.beforeEach(async ({ page }) => {
    await H.openApp(page);
  });

  test('selecting Registered Nurses fills the KPI tiles', async ({ page }) => {
    expect(await H.selectSoc(page, '29-1141')).toBeTruthy();

    // Contract value: aMedian 84320 -> "$84,320".
    await expect(page.getByTestId('kpi-median')).toHaveText('$84,320');

    // The other KPI tiles must be populated with a value (not empty, not a dash).
    for (const id of ['kpi-emp', 'kpi-mean', 'kpi-lq']) {
      await expect(page.getByTestId(id)).toHaveText(/\d/);
    }

    // The detail panel header reflects the selected occupation.
    await expect(page.getByTestId('detail-title')).toHaveText('Registered Nurses');
  });
});
