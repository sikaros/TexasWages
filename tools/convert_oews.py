#!/usr/bin/env python3
"""Convert a BLS OEWS Texas state Excel file into ``resources/data/tx_oews.json``.

This module is both a small CLI and a library of pure, unit-testable helpers.
The output JSON conforms to ``resources/data/schema.json`` (JSON Schema draft-07)
and is validated against it before anything is written to disk.

Design notes
------------
* ``parse_wage`` / ``parse_emp`` / ``soc_major`` are pure and have no third-party
  dependencies, so the fast unit tests can import this module without pandas or
  openpyxl installed.
* ``read_state_xlsx`` lazily imports pandas and ``validate_dataset`` lazily imports
  jsonschema, so importing this module never fails just because a heavy optional
  dependency is missing.
* Annual figures are emitted as JSON integers; hourly figures as JSON numbers
  (floats). ``parse_wage`` returns a plain number and the mapping layer decides
  int vs. float per the schema.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys

# --------------------------------------------------------------------------- #
# SOC major group lookup
# --------------------------------------------------------------------------- #

SOC_MAJOR_GROUPS = {
    "11-0000": "Management Occupations",
    "13-0000": "Business and Financial Operations Occupations",
    "15-0000": "Computer and Mathematical Occupations",
    "17-0000": "Architecture and Engineering Occupations",
    "19-0000": "Life, Physical, and Social Science Occupations",
    "21-0000": "Community and Social Service Occupations",
    "23-0000": "Legal Occupations",
    "25-0000": "Educational Instruction and Library Occupations",
    "27-0000": "Arts, Design, Entertainment, Sports, and Media Occupations",
    "29-0000": "Healthcare Practitioners and Technical Occupations",
    "31-0000": "Healthcare Support Occupations",
    "33-0000": "Protective Service Occupations",
    "35-0000": "Food Preparation and Serving Related Occupations",
    "37-0000": "Building and Grounds Cleaning and Maintenance Occupations",
    "39-0000": "Personal Care and Service Occupations",
    "41-0000": "Sales and Related Occupations",
    "43-0000": "Office and Administrative Support Occupations",
    "45-0000": "Farming, Fishing, and Forestry Occupations",
    "47-0000": "Construction and Extraction Occupations",
    "49-0000": "Installation, Maintenance, and Repair Occupations",
    "51-0000": "Production Occupations",
    "53-0000": "Transportation and Material Moving Occupations",
    "55-0000": "Military Specific Occupations",
}

# BLS OEWS "wage" cells we read from the state file. Hourly cells become floats,
# annual cells become ints when emitted.
_HOURLY_KEYS = ("H_MEAN", "H_MEDIAN", "H_PCT10", "H_PCT25", "H_PCT75", "H_PCT90")
_ANNUAL_KEYS = ("A_MEAN", "A_MEDIAN", "A_PCT10", "A_PCT25", "A_PCT75", "A_PCT90")
_WAGE_KEYS = _HOURLY_KEYS + _ANNUAL_KEYS
# The four cells that determine wageSuppressed (median/mean, hourly + annual).
_MEAN_MEDIAN_KEYS = ("H_MEAN", "A_MEAN", "H_MEDIAN", "A_MEDIAN")

# Markers BLS uses for "not available / suppressed" (as opposed to "#" = top-coded).
_NOT_AVAILABLE = {"", "*", "**"}

# --------------------------------------------------------------------------- #
# Path helpers (repo-relative, robust to the current working directory)
# --------------------------------------------------------------------------- #

_MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(_MODULE_DIR)
DEFAULT_SCHEMA_PATH = os.path.join(_REPO_ROOT, "resources", "data", "schema.json")
DEFAULT_OUTPUT_PATH = os.path.join(_REPO_ROOT, "resources", "data", "tx_oews.json")


# --------------------------------------------------------------------------- #
# Pure parse helpers
# --------------------------------------------------------------------------- #

def _is_nan(raw):
    """True for a genuine float NaN (pandas leaves these behind for empty cells)."""
    return isinstance(raw, float) and math.isnan(raw)


def parse_wage(raw):
    """Parse a single OEWS wage cell.

    Returns a ``(value, top_coded)`` tuple:

    * ``"*"``, ``""``, ``None``, ``"**"`` -> ``(None, False)`` (not available / suppressed)
    * ``"#"`` -> ``(None, True)`` (top-coded: wage is at or above the OEWS cap of
      $115.00/hr or $239,200/yr)
    * numeric strings such as ``"52340"``, ``"52,340"`` or ``"40.54"`` ->
      ``(52340, False)`` / ``(40.54, False)``. ``$`` and thousands commas are
      stripped. Integers are returned as ``int``, decimals as ``float`` -- the
      caller coerces to the type the schema wants (int for annual, float for hourly).
    """
    if raw is None or _is_nan(raw):
        return (None, False)
    s = str(raw).strip()
    if s in _NOT_AVAILABLE:
        return (None, False)
    if s == "#":
        return (None, True)
    s = s.replace("$", "").replace(",", "").strip()
    if s in _NOT_AVAILABLE:
        return (None, False)
    if "." in s or "e" in s.lower():
        return (float(s), False)
    return (int(s), False)


def parse_emp(raw):
    """Parse a total-employment cell.

    Returns ``(value, suppressed)``:

    * ``"**"``, ``""``, ``None``, ``"*"`` -> ``(None, True)`` (suppressed)
    * ``"217,600"`` -> ``(217600, False)``
    """
    if raw is None or _is_nan(raw):
        return (None, True)
    s = str(raw).strip()
    if s in _NOT_AVAILABLE:
        return (None, True)
    s = s.replace(",", "").strip()
    if s in _NOT_AVAILABLE:
        return (None, True)
    # int(float(...)) tolerates pandas' "217600.0" str-casting of numeric cells.
    return (int(float(s)), False)


def soc_major(occ_code):
    """Map an SOC detailed code to its major group.

    ``"29-1141"`` -> ``("29-0000", "Healthcare Practitioners and Technical Occupations")``.
    Raises ``KeyError`` for an unknown / malformed prefix.
    """
    if occ_code is None:
        raise KeyError("soc_major requires an occupation code, got None")
    code = str(occ_code).strip()
    prefix = code[:2]
    if len(prefix) != 2 or not prefix.isdigit():
        raise KeyError(f"Malformed SOC code {occ_code!r}: expected a leading 'NN-' group")
    major_code = f"{prefix}-0000"
    title = SOC_MAJOR_GROUPS.get(major_code)
    if title is None:
        raise KeyError(f"Unknown SOC major group {major_code!r} for code {occ_code!r}")
    return (major_code, title)


# --------------------------------------------------------------------------- #
# Record mapping
# --------------------------------------------------------------------------- #

def map_record(raw):
    """Map one raw BLS row (dict of str values) to a schema-shaped model row.

    Expects the OEWS column names: ``OCC_CODE, OCC_TITLE, TOT_EMP, JOBS_1000,
    LOC_QUOTIENT`` and the hourly/annual wage columns. Missing keys are treated
    as "not available".
    """
    occ_code = (str(raw.get("OCC_CODE") or "")).strip()
    major_code, major_title = soc_major(occ_code)

    # Parse every wage cell once, tracking value + top-coded flag per cell.
    values = {}
    top_flags = {}
    for key in _WAGE_KEYS:
        val, top = parse_wage(raw.get(key))
        values[key] = val
        top_flags[key] = top

    emp_val, emp_suppressed = parse_emp(raw.get("TOT_EMP"))
    jobs_val, _ = parse_wage(raw.get("JOBS_1000"))
    lq_val, _ = parse_wage(raw.get("LOC_QUOTIENT"))

    top_coded = any(top_flags[k] for k in _WAGE_KEYS)
    # A mean/median cell that is None *and not top-coded* means the wage was
    # suppressed ("*"). A None from "#" is a cap, not a suppression.
    wage_suppressed = any(
        values[k] is None and not top_flags[k] for k in _MEAN_MEDIAN_KEYS
    )

    def as_int(v):
        return None if v is None else int(round(v))

    def as_float(v):
        return None if v is None else float(v)

    return {
        "socCode": occ_code,
        "title": (str(raw.get("OCC_TITLE") or "")).strip(),
        "oGroup": "detailed",
        "majorGroupCode": major_code,
        "majorGroupTitle": major_title,
        "totalEmp": emp_val,
        "jobsPer1000": as_float(jobs_val),
        "locQuotient": as_float(lq_val),
        "hMean": as_float(values["H_MEAN"]),
        "aMean": as_int(values["A_MEAN"]),
        "hMedian": as_float(values["H_MEDIAN"]),
        "aMedian": as_int(values["A_MEDIAN"]),
        "hPct10": as_float(values["H_PCT10"]),
        "hPct25": as_float(values["H_PCT25"]),
        "hPct75": as_float(values["H_PCT75"]),
        "hPct90": as_float(values["H_PCT90"]),
        "aPct10": as_int(values["A_PCT10"]),
        "aPct25": as_int(values["A_PCT25"]),
        "aPct75": as_int(values["A_PCT75"]),
        "aPct90": as_int(values["A_PCT90"]),
        "topCoded": top_coded,
        "wageSuppressed": wage_suppressed,
        "empSuppressed": emp_suppressed,
    }


def build_dataset(records, data_year="May 2025", generated=None):
    """Assemble the full dataset ``{"meta": {...}, "rows": [...]}``.

    ``records`` is an iterable of raw BLS row dicts (as returned by
    ``read_state_xlsx``). Each is mapped to a schema-shaped row. ``generated`` is
    optional so this function stays pure/deterministic for unit tests; the CLI
    stamps it at run time.
    """
    rows = [map_record(r) for r in records]
    meta = {
        "dataYear": data_year,
        "source": (
            "U.S. Bureau of Labor Statistics, Occupational Employment and Wage "
            "Statistics (OEWS)"
        ),
        "area": "Texas",
        "rowCount": len(rows),
    }
    if generated:
        meta["generated"] = generated
    return {"meta": meta, "rows": rows}


# --------------------------------------------------------------------------- #
# I/O (heavy deps imported lazily)
# --------------------------------------------------------------------------- #

# BLS OEWS state-file columns we consume.
BLS_COLUMNS = (
    "OCC_CODE", "OCC_TITLE", "TOT_EMP", "JOBS_1000", "LOC_QUOTIENT",
    "H_MEAN", "A_MEAN", "H_MEDIAN", "A_MEDIAN",
    "H_PCT10", "H_PCT25", "H_PCT75", "H_PCT90",
    "A_PCT10", "A_PCT25", "A_PCT75", "A_PCT90",
)


def read_state_xlsx(path, area="Texas", o_group="detailed"):
    """Read a BLS OEWS state Excel file into a list of raw row dicts.

    Everything is read as text (``dtype=str``) so the parse helpers see the exact
    BLS markers ("*", "**", "#"). The result is filtered to ``AREA_TITLE == area``
    and ``O_GROUP == o_group`` (defaults: Texas, detailed occupations).
    """
    import pandas as pd  # lazy: keeps pure-function tests importable without pandas

    df = pd.read_excel(path, dtype=str)
    # Empty cells arrive as NaN even under dtype=str; normalise to "".
    df = df.fillna("")
    area_col = df["AREA_TITLE"].astype(str).str.strip()
    group_col = df["O_GROUP"].astype(str).str.strip()
    df = df[(area_col == area) & (group_col == o_group)]
    return df.to_dict(orient="records")


def validate_dataset(dataset, schema_path=None):
    """Validate ``dataset`` against the JSON schema; raises on failure."""
    import jsonschema  # lazy

    if schema_path is None:
        schema_path = DEFAULT_SCHEMA_PATH
    with open(schema_path, encoding="utf-8") as fh:
        schema = json.load(fh)
    jsonschema.validate(instance=dataset, schema=schema)
    return True


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Convert a BLS OEWS Texas state xlsx into resources/data/tx_oews.json",
    )
    parser.add_argument("--input", required=True, help="Path to the BLS OEWS state .xlsx file")
    parser.add_argument(
        "--output",
        default=os.path.join("resources", "data", "tx_oews.json"),
        help="Output JSON path (default: resources/data/tx_oews.json)",
    )
    parser.add_argument("--data-year", dest="data_year", default="May 2025", help='e.g. "May 2025"')
    parser.add_argument(
        "--schema",
        default=DEFAULT_SCHEMA_PATH,
        help="Path to schema.json used for validation before writing",
    )
    args = parser.parse_args(argv)

    records = read_state_xlsx(args.input)

    from datetime import datetime  # runtime-only; not used by build_dataset itself
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    dataset = build_dataset(records, data_year=args.data_year, generated=generated)

    try:
        validate_dataset(dataset, args.schema)
    except Exception as exc:  # jsonschema.ValidationError or file/JSON errors
        print(f"ERROR: generated dataset failed schema validation: {exc}", file=sys.stderr)
        return 1

    out_dir = os.path.dirname(os.path.abspath(args.output))
    if out_dir and not os.path.isdir(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(dataset, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"Wrote {len(dataset['rows'])} rows to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
