# TexasWages data pipeline — notes

Converts a BLS OEWS **Texas state** Excel file into `resources/data/tx_oews.json`,
the data contract the Ext JS app loads. Output is validated against
`resources/data/schema.json` before it is written.

## What's here

| File | Purpose |
|---|---|
| `tools/convert_oews.py` | CLI + importable helpers (`parse_wage`, `parse_emp`, `soc_major`, `map_record`, `build_dataset`, `read_state_xlsx`, `validate_dataset`, `main`). |
| `tools/requirements.txt` | `pandas`, `openpyxl`, `jsonschema`. |
| `tests/pytest/test_convert_oews.py` | Unit tests for acceptance item 1 (parse helpers, SOC mapping, schema validation of generated + committed sample data). |
| `tests/pytest/conftest.py` | Puts `tools/` on `sys.path` and locates `schema.json` / the sample fixture by walking up from the test file. |

## How it works

1. `read_state_xlsx(path)` — `pandas.read_excel(path, dtype=str)`, normalises empty
   cells to `""`, and keeps only rows where `AREA_TITLE == "Texas"` and
   `O_GROUP == "detailed"`. Returns raw BLS row dicts.
2. `build_dataset(records, data_year=...)` — maps each raw row to the camelCase
   schema shape via the pure parse helpers:
   - `parse_wage` / `parse_emp` handle the BLS markers: `*`, `**`, `""` → not
     available; `#` → top-coded (≥ $115.00/hr or $239,200/yr).
   - Annual figures are emitted as JSON **integers**, hourly as **numbers** (floats).
   - `topCoded` = any wage cell was `#`; `wageSuppressed` = a mean/median cell is
     null due to `*` (a `#` cap does **not** count as suppression); `empSuppressed`
     comes from the employment cell.
   - `majorGroupCode` / `majorGroupTitle` derive from `soc_major(OCC_CODE)`.
   - `meta.rowCount == len(rows)`.
3. `main()` validates the assembled dataset against `schema.json` (`jsonschema`)
   and, only if valid, writes pretty UTF-8 JSON (`ensure_ascii=False`).

## Generate real data (once the xlsx is downloaded)

Download the May 2025 OEWS **state** cross-industry file from BLS
(<https://www.bls.gov/oes/tables.htm> → "State" → e.g. `oesm25st.zip`) and unzip.
The Texas rows live in the state workbook (commonly `oesm25st/state_M2025_dl.xlsx`).

From the repo root:

```sh
python -m pip install -r tools/requirements.txt
python tools/convert_oews.py --input path/to/state_M2025_dl.xlsx \
    --output resources/data/tx_oews.json --data-year "May 2025"
```

The command exits non-zero (and writes nothing) if the result fails schema
validation.

## Run the tests

```sh
python -m pip install -r tools/requirements.txt pytest
pytest tests/pytest
```
