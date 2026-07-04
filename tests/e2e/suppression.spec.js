// Criterion 7 — Suppression rendering.
// The top-coded physician row (29-1216) renders "≥ $239,200" for cap-suppressed wage
// cells; the wage-suppressed row (45-2091) renders "—". Neither breaks rendering.
// The cap ceiling (U+2265 "≥") and em-dash (U+2014 "—") below are the exact glyphs
// TexasWages.util.Format emits; this file is UTF-8, matching the app source.
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const GTE_CAP = '≥ $239,200';
const DASH = '—';

test.describe('suppression', () => {
  test.beforeEach(async ({ page }) => {
    await H.openApp(page);
  });

  test('top-coded physician row shows the ≥ cap', async ({ page }) => {
    const rec = await H.recordBySoc(page, '29-1216');
    expect(rec.topCoded).toBe(true);
    expect(rec.aMedian).toBeNull();

    const text = await H.rowTextBySoc(page, '29-1216');
    expect(text).toContain(GTE_CAP);
  });

  test('wage-suppressed row shows an em-dash', async ({ page }) => {
    const rec = await H.recordBySoc(page, '45-2091');
    expect(rec.wageSuppressed).toBe(true);
    expect(rec.aMedian).toBeNull();

    const text = await H.rowTextBySoc(page, '45-2091');
    expect(text).toContain(DASH);
    // A suppressed (not top-coded) row must NOT render the cap ceiling.
    expect(text).not.toContain(GTE_CAP);
  });
});
