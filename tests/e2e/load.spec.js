// Criterion 2 — Store load.
// The grid store loads with a positive count (21 rows with the sample data) and the
// app boots without any uncaught page errors.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test.describe('load', () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = H.collectPageErrors(page); // attach BEFORE navigation
    await H.openApp(page);
  });

  test('store loads 21 rows with no page errors', async ({ page }) => {
    expect(await H.storeCount(page)).toBe(21);

    // The grid itself is present and addressable by its stable testId.
    await expect(page.getByTestId('wage-grid')).toBeVisible();

    expect(errors, `unexpected page errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
