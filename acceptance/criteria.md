# TexasWages — Acceptance Criteria (the build/validation contract)

Shared contract for the build crew. The validation shipmate writes Playwright specs to these;
each feature is "done" when its criterion is green against `sencha app watch` on `main`.

## Shared names (do not rename without updating this file)

- **Store:** `TexasWages.store.Occupations` (alias `store.occupations`), root `rows`, url `resources/data/tx_oews.json`.
- **Model fields:** see `resources/data/schema.json` (camelCase: `socCode`, `title`, `majorGroupCode`,
  `majorGroupTitle`, `totalEmp`, `aMedian`, `aMean`, `aPct10/25/75/90`, `locQuotient`, `topCoded`,
  `wageSuppressed`, `empSuppressed`, plus hourly `hMean/hMedian/hPct*`).
- **Component references / testIds:**
  | component | reference | testId |
  |---|---|---|
  | grid | `wageGrid` | `wage-grid` |
  | search field | `searchField` | `search-field` |
  | CSV export button | — | `export-csv` |
  | detail panel | `detailPanel` | `detail-panel` |
  | wage percentile chart | `wageChart` | `wage-chart` |
  | KPI values (in detail tpl) | — | `kpi-emp`, `kpi-median`, `kpi-mean`, `kpi-lq` |
- **Global for E2E:** `Ext.ComponentQuery.query('grid[reference=wageGrid]')[0]` reaches the grid;
  `.getStore()` is truth for data assertions.

## Playwright ground rules (Ext JS dynamic DOM)

- Never assert on auto-ids (`#gridview-1071`). Use `page.getByTestId(...)` or `getByRole`.
- Wait for data before asserting: `page.waitForFunction(() => { const g = Ext.ComponentQuery.query('grid[reference=wageGrid]')[0]; const s = g && g.getStore(); return s && !s.isLoading() && s.getCount() > 0; })`.
- Buffered grid: assert on the store (`getCount`, `getAt(i).data`, group counts) via `page.evaluate`, not the DOM. To click a row, `grid.ensureVisible(grid.getStore().findExact('socCode','29-1141'), {select:true})` first.

## Features → acceptance criteria

1. **Pipeline (pytest, data-first)**
   - `parse_wage("*")` and `parse_wage("")` → `None`; `parse_wage("#")` → `None` with top-coded flag; `parse_wage("52340")` → `52340`.
   - `soc_major("29-1141")` → `("29-0000", "Healthcare Practitioners and Technical Occupations")`.
   - Texas filter keeps only `AREA_TITLE == "Texas"`, `O_GROUP == "detailed"`.
   - Emitted JSON validates against `resources/data/schema.json`; `meta.rowCount == len(rows)`.

2. **Store load** — Given the app is open, the grid store loads with `getCount() > 0` (21 with sample data), no console errors.

3. **Grouping + summary** — rows are grouped by SOC major group; number of groups == distinct `majorGroupCode` in the store; each group header shows the `majorGroupTitle` and a count; a group summary row shows summed employment.

4. **Search** — typing `nurse` in `search-field` filters the store so every remaining row's `title` or `socCode` contains "nurse" (case-insensitive); typing `29-1141` filters to Registered Nurses; clearing restores full count.

5. **Selection → detail** — selecting the Registered Nurses row sets `kpi-median` to the record's `aMedian` (formatted `$84,320`) and populates `kpi-emp`, `kpi-mean`, `kpi-lq`.

6. **Wage percentile chart** — on selection, `wage-chart` store has one bar per non-null annual percentile (5 for Registered Nurses); for the top-coded physician row the chart still renders (fewer bars) and does not throw.

7. **Suppression rendering** — the top-coded physician row shows `≥ $239,200` for suppressed-by-cap wage cells; the wage-suppressed row shows `—`; neither breaks rendering.

8. **CSV export** — clicking `export-csv` triggers a download; the file's header row matches the exported columns and a known row (Registered Nurses) is present with correctly quoted fields.
