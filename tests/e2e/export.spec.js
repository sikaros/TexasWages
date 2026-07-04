// Criterion 8 — CSV export.
// Clicking export-csv triggers a client-side download; the file's header row matches
// the exported columns, a known row (Registered Nurses) is present, and fields that
// contain commas are quoted (RFC-4180 style).
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

// Mirrors MainController.csvColumns header labels, in order.
const EXPECTED_HEADER = [
  'SOC Code', 'Occupation', 'Major Group', 'Employment', 'Median Annual',
  'Mean Annual', '10th Pct Annual', '25th Pct Annual', '75th Pct Annual',
  '90th Pct Annual', 'Location Quotient'
].join(',');

test.describe('CSV export', () => {
  test.beforeEach(async ({ page }) => {
    await H.openApp(page);
  });

  test('exports a well-formed CSV with quoted comma-fields', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-csv').click()
    ]);

    expect(download.suggestedFilename()).toBe('texas_wages.csv');

    const filePath = await download.path();
    const csv = fs.readFileSync(filePath, 'utf8');
    const lines = csv.split(/\r\n|\n/).filter((l) => l.length > 0);

    // Header row matches the exported columns exactly.
    expect(lines[0]).toBe(EXPECTED_HEADER);

    // Header + 21 data rows.
    expect(lines).toHaveLength(22);

    // Registered Nurses line is present with its key fields.
    const rnLine = lines.find((l) => l.startsWith('29-1141,'));
    expect(rnLine, 'Registered Nurses (29-1141) row should be present').toBeTruthy();
    expect(rnLine).toContain('Registered Nurses');
    expect(rnLine).toContain('Healthcare Practitioners and Technical Occupations');
    expect(rnLine).toContain('84320'); // aMedian, raw value in the export

    // A field containing a comma must be wrapped in double quotes.
    // "Elementary School Teachers, Except Special Education" is such a title.
    expect(csv).toContain('"Elementary School Teachers, Except Special Education"');
  });
});
