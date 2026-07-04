// Criterion 3 — Grouping + summary.
// Rows are grouped by SOC major group: the number of groups equals the distinct
// majorGroupCode count (13 with sample data) and a known group header renders its
// majorGroupTitle.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test.describe('grouping', () => {
  test.beforeEach(async ({ page }) => {
    await H.openApp(page);
  });

  test('store has 13 groups', async ({ page }) => {
    expect(await H.groupCount(page)).toBe(13);
  });

  test('a known group header shows its majorGroupTitle', async ({ page }) => {
    // Store is sorted by majorGroupCode ASC, so 11-0000 "Management Occupations"
    // is the first group and is rendered at the top of the buffered view.
    const rec = await H.recordBySoc(page, '11-1021');
    expect(rec.majorGroupTitle).toBe('Management Occupations');

    // The groupHeaderTpl renders "<majorGroupTitle> (<count>)".
    await expect(page.getByText(rec.majorGroupTitle).first()).toBeVisible();
  });
});
