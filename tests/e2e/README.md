# TexasWages — Playwright E2E suite

End-to-end tests that validate the TexasWages Ext JS app against a **running dev
server** at `http://localhost:1841` (started elsewhere via `sencha app watch`). This
suite does **not** start or stop the server — configure/run it separately.

## Run

```bash
npm install            # installs @playwright/test
npx playwright install # one-time: download the chromium browser
npx playwright test    # runs the suite (also: npm test)
```

Run a single feature area, e.g.:

```bash
npx playwright test search
```

## How these tests talk to Ext JS

Ext renders a virtualized, auto-id'd DOM, so the specs follow the app's validation
contract (`acceptance/criteria.md`):

- Components are located by stable `data-testid`s (`wage-grid`, `search-field`,
  `export-csv`, `detail-panel`, `wage-chart`, `kpi-*`, `detail-title`) — never Ext
  auto ids.
- Data is asserted on the **store** (via `page.evaluate` against
  `Ext.ComponentQuery.query('grid[reference=wageGrid]')[0].getStore()`), not the
  buffered grid DOM.
- No arbitrary sleeps — `page.waitForFunction` polls the store/chart until ready.

Shared helpers live in [`helpers.js`](./helpers.js) (`openApp`, `waitForStore`,
`storeCount`, `groupCount`, `recordBySoc`, `selectSoc`, `chartBarCount`,
`rowTextBySoc`, `typeSearch`, `clickClearSearch`, `collectPageErrors`).

## Specs (map to acceptance criteria 2–8)

| Spec | Criterion | What it checks |
|---|---|---|
| `load.spec.js` | 2 — Store load | store count `=== 21`; no uncaught page errors |
| `grouping.spec.js` | 3 — Grouping | group count `=== 13`; a known group header shows its `majorGroupTitle` |
| `search.spec.js` | 4 — Search | `nurse` → every remaining row matches; `29-1141` → count `=== 1`; clear → back to 21 |
| `selection.spec.js` | 5 — Selection → KPIs | select `29-1141` → `kpi-median` is `$84,320`; `kpi-emp`/`kpi-mean`/`kpi-lq` populated |
| `chart.spec.js` | 6 — Chart | `29-1141` → 5 bars; top-coded `29-1216` → fewer bars, chart renders, no error |
| `suppression.spec.js` | 7 — Suppression | `29-1216` renders `≥ $239,200`; `45-2091` renders `—` |
| `export.spec.js` | 8 — CSV export | download fires; header matches; Registered Nurses row present; comma-fields quoted |

> Some specs may be **RED** until the corresponding UI is finished — they are written
> to the contract regardless. Expected values assume the current **SAMPLE** dataset
> (21 rows, 13 major groups).
