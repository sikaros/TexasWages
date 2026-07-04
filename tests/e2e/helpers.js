/**
 * Shared E2E helpers for the TexasWages Ext JS app.
 *
 * Ext renders a virtualized, auto-id'd DOM, so these helpers reach INTO the running
 * Ext app via `page.evaluate` and read the *store* (the source of truth for data)
 * rather than scraping the buffered grid DOM. Components are located by their stable
 * `reference` (set in the views) — never by Ext's churny auto ids.
 *
 * The grid is always reachable as:
 *     Ext.ComponentQuery.query('grid[reference=wageGrid]')[0]
 * and `.getStore()` is truth for count/group/record assertions.
 */

// Generous ceiling for waits that depend on the (externally managed) dev server.
const WAIT_TIMEOUT = 60000;

/** Navigate to the app root and block until the grid store has loaded rows. */
async function openApp(page) {
  await page.goto('/');
  await waitForStore(page);
}

/**
 * Resolve when the grid's store exists, has finished loading, and has >0 rows.
 * Guards on `window.Ext` because the microloader hasn't defined Ext on first ticks.
 */
async function waitForStore(page) {
  await page.waitForFunction(() => {
    try {
      // During Ext boot the `Ext` global appears before ComponentQuery does,
      // so guard both and swallow transient boot errors (return false -> keep polling).
      if (!window.Ext || !window.Ext.ComponentQuery) return false;
      const g = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
      const s = g && g.getStore();
      return !!s && !s.isLoading() && s.getCount() > 0;
    } catch (e) { return false; }
  }, undefined, { timeout: WAIT_TIMEOUT });
}

/** Number of records currently in the (possibly filtered) grid store. */
async function storeCount(page) {
  return page.evaluate(() => {
    const g = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
    const s = g && g.getStore();
    return s ? s.getCount() : -1;
  });
}

/** Number of distinct groups (SOC major groups) in the grid store. */
async function groupCount(page) {
  return page.evaluate(() => {
    const g = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
    const s = g && g.getStore();
    if (!s) return -1;
    const groups = s.getGroups();
    return groups ? groups.getCount() : 0;
  });
}

/**
 * Return the raw `.data` of the record with the given SOC code (or null).
 * Uses `findExact` per the contract; searches within the current filtered set.
 */
async function recordBySoc(page, soc) {
  return page.evaluate((socArg) => {
    const g = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
    const s = g && g.getStore();
    if (!s) return null;
    const idx = s.findExact('socCode', socArg);
    return idx === -1 ? null : s.getAt(idx).data;
  }, soc);
}

/**
 * Scroll the SOC-coded row into the buffered viewport, select it, and make sure the
 * detail panel updates. `ensureVisible(..., {select:true})` handles scroll+select;
 * we then also select via the selection model and fire the grid's `select` event so
 * the Main controller's `onOccupationSelect` runs even if ensureVisible didn't emit it.
 * Returns true if the row was found.
 */
async function selectSoc(page, soc) {
  return page.evaluate((socArg) => {
    const grid = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
    const store = grid && grid.getStore();
    if (!store) return false;
    const idx = store.findExact('socCode', socArg);
    if (idx === -1) return false;
    const rec = store.getAt(idx);
    grid.ensureVisible(idx, { select: true });
    grid.getSelectionModel().select(rec);
    grid.fireEvent('select', grid, rec, idx);
    return true;
  }, soc);
}

/** Number of bars (records) currently in the wage-percentile chart's store. */
async function chartBarCount(page) {
  return page.evaluate(() => {
    const c = Ext.ComponentQuery.query('[reference=wageChart]')[0];
    const s = c && c.getStore();
    return s ? s.getCount() : -1;
  });
}

/**
 * Ensure the SOC-coded row is rendered, then return its rendered row `textContent`.
 * Use this to verify cell *rendering* (e.g. suppression: "≥ $239,200" / "—").
 */
async function rowTextBySoc(page, soc) {
  await page.waitForFunction((socArg) => {
    try {
      if (!window.Ext || !window.Ext.ComponentQuery) return false;
      const grid = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
      const store = grid && grid.getStore();
      if (!store) return false;
      const idx = store.findExact('socCode', socArg);
      if (idx === -1) return false;
      grid.ensureVisible(idx);
      return !!grid.getView().getNode(store.getAt(idx));
    } catch (e) { return false; }
  }, soc, { timeout: WAIT_TIMEOUT });

  return page.evaluate((socArg) => {
    const grid = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0];
    const store = grid.getStore();
    const idx = store.findExact('socCode', socArg);
    const node = grid.getView().getNode(store.getAt(idx));
    return node ? node.textContent : null;
  }, soc);
}

/**
 * Type into the search field like a user: focus, clear any existing text, then send
 * real keystrokes (so Ext's `checkChange` -> buffered `change` -> `onSearch` fires).
 * The field's `data-testid` sits on the component el, so we target the inner input.
 */
async function typeSearch(page, text) {
  const input = page.getByTestId('search-field').getByRole('textbox');
  await input.click();
  await input.press('Control+a');
  await input.press('Delete');
  if (text) {
    await input.pressSequentially(text, { delay: 25 });
  }
}

/** Click the search field's clear trigger (fires onClearSearch -> removes the filter). */
async function clickClearSearch(page) {
  await page.getByTestId('search-field').locator('.x-form-clear-trigger').click();
}

/**
 * Start collecting uncaught page errors. Call BEFORE navigating, then assert the
 * returned array is empty after the interactions under test.
 */
function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

module.exports = {
  WAIT_TIMEOUT,
  openApp,
  waitForStore,
  storeCount,
  groupCount,
  recordBySoc,
  selectSoc,
  chartBarCount,
  rowTextBySoc,
  typeSearch,
  clickClearSearch,
  collectPageErrors
};
