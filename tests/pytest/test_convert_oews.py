"""Unit tests for tools/convert_oews.py — covers acceptance criteria item 1.

Run from the repo root with:  pytest tests/pytest
(``conftest.py`` puts ``tools/`` on sys.path and locates the schema/fixture.)
"""

import json

import jsonschema
import pytest

from convert_oews import (
    SOC_MAJOR_GROUPS,
    build_dataset,
    map_record,
    parse_emp,
    parse_wage,
    soc_major,
)


# --------------------------------------------------------------------------- #
# parse_wage
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("raw", ["*", "", None, "**"])
def test_parse_wage_not_available(raw):
    assert parse_wage(raw) == (None, False)


def test_parse_wage_top_coded():
    assert parse_wage("#") == (None, True)


def test_parse_wage_integer_string():
    value, top = parse_wage("52340")
    assert value == 52340
    assert top is False


def test_parse_wage_strips_commas_and_dollar():
    assert parse_wage("52,340") == (52340, False)
    assert parse_wage("$52,340") == (52340, False)


def test_parse_wage_hourly_float():
    value, top = parse_wage("40.54")
    assert value == pytest.approx(40.54)
    assert isinstance(value, float)
    assert top is False


# --------------------------------------------------------------------------- #
# parse_emp
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("raw", ["**", "", None, "*"])
def test_parse_emp_suppressed(raw):
    assert parse_emp(raw) == (None, True)


def test_parse_emp_value():
    assert parse_emp("217,600") == (217600, False)


# --------------------------------------------------------------------------- #
# soc_major
# --------------------------------------------------------------------------- #

def test_soc_major_healthcare():
    assert soc_major("29-1141") == (
        "29-0000",
        "Healthcare Practitioners and Technical Occupations",
    )


def test_soc_major_computer():
    code, title = soc_major("15-1252")
    assert code == "15-0000"
    assert title == "Computer and Mathematical Occupations"


def test_soc_major_unknown_prefix_raises():
    with pytest.raises(KeyError):
        soc_major("99-1234")


def test_soc_major_groups_map_complete():
    # The map the module ships must at least contain the groups the sample uses.
    assert SOC_MAJOR_GROUPS["29-0000"] == "Healthcare Practitioners and Technical Occupations"


# --------------------------------------------------------------------------- #
# build_dataset
# --------------------------------------------------------------------------- #

def _synthetic_records():
    """A small hand-authored batch of raw BLS rows exercising each code path:
    normal, top-coded ("#"), wage-suppressed ("*"), and emp-suppressed ("**")."""
    return [
        {  # normal detailed row
            "AREA_TITLE": "Texas", "O_GROUP": "detailed",
            "OCC_CODE": "29-1141", "OCC_TITLE": "Registered Nurses",
            "TOT_EMP": "234,000", "JOBS_1000": "16.6", "LOC_QUOTIENT": "0.93",
            "H_MEAN": "42.31", "A_MEAN": "88,000", "H_MEDIAN": "40.54", "A_MEDIAN": "84,320",
            "H_PCT10": "29.81", "H_PCT25": "34.62", "H_PCT75": "48.08", "H_PCT90": "58.65",
            "A_PCT10": "62,000", "A_PCT25": "72,000", "A_PCT75": "100,000", "A_PCT90": "122,000",
        },
        {  # top-coded physician: mean/median are "#", some percentiles too
            "AREA_TITLE": "Texas", "O_GROUP": "detailed",
            "OCC_CODE": "29-1216", "OCC_TITLE": "General Internal Medicine Physicians",
            "TOT_EMP": "3,200", "JOBS_1000": "0.23", "LOC_QUOTIENT": "0.9",
            "H_MEAN": "#", "A_MEAN": "#", "H_MEDIAN": "#", "A_MEDIAN": "#",
            "H_PCT10": "57.69", "H_PCT25": "86.54", "H_PCT75": "#", "H_PCT90": "#",
            "A_PCT10": "120,000", "A_PCT25": "180,000", "A_PCT75": "#", "A_PCT90": "#",
        },
        {  # wage-suppressed: all wages "*"
            "AREA_TITLE": "Texas", "O_GROUP": "detailed",
            "OCC_CODE": "45-2091", "OCC_TITLE": "Agricultural Equipment Operators",
            "TOT_EMP": "1,800", "JOBS_1000": "0.13", "LOC_QUOTIENT": "0.7",
            "H_MEAN": "*", "A_MEAN": "*", "H_MEDIAN": "*", "A_MEDIAN": "*",
            "H_PCT10": "*", "H_PCT25": "*", "H_PCT75": "*", "H_PCT90": "*",
            "A_PCT10": "*", "A_PCT25": "*", "A_PCT75": "*", "A_PCT90": "*",
        },
        {  # employment suppressed ("**"), wages present
            "AREA_TITLE": "Texas", "O_GROUP": "detailed",
            "OCC_CODE": "11-1021", "OCC_TITLE": "General and Operations Managers",
            "TOT_EMP": "**", "JOBS_1000": "", "LOC_QUOTIENT": "",
            "H_MEAN": "65.87", "A_MEAN": "137,000", "H_MEDIAN": "48.56", "A_MEDIAN": "101,000",
            "H_PCT10": "24.52", "H_PCT25": "32.69", "H_PCT75": "80.77", "H_PCT90": "114.9",
            "A_PCT10": "51,000", "A_PCT25": "68,000", "A_PCT75": "168,000", "A_PCT90": "239,000",
        },
    ]


def test_build_dataset_meta_row_count():
    records = _synthetic_records()
    dataset = build_dataset(records, data_year="May 2025")
    assert dataset["meta"]["rowCount"] == len(dataset["rows"]) == len(records)
    assert dataset["meta"]["dataYear"] == "May 2025"
    assert dataset["meta"]["area"] == "Texas"


def test_build_dataset_keys_match_schema(schema):
    dataset = build_dataset(_synthetic_records())
    required = set(schema["definitions"]["occupation"]["required"])
    for row in dataset["rows"]:
        # additionalProperties:false + all-required => keys must match exactly.
        assert set(row.keys()) == required


def test_build_dataset_field_types_and_flags():
    rows = build_dataset(_synthetic_records())["rows"]
    nurse, physician, ag, manager = rows

    # Normal row: annual is int, hourly is float, no flags.
    assert nurse["aMedian"] == 84320 and isinstance(nurse["aMedian"], int)
    assert nurse["hMedian"] == pytest.approx(40.54) and isinstance(nurse["hMedian"], float)
    assert nurse["totalEmp"] == 234000
    assert nurse["majorGroupCode"] == "29-0000"
    assert (nurse["topCoded"], nurse["wageSuppressed"], nurse["empSuppressed"]) == (False, False, False)

    # Top-coded: mean/median null via "#", flagged topCoded, NOT wageSuppressed.
    assert physician["aMean"] is None and physician["hMedian"] is None
    assert physician["topCoded"] is True
    assert physician["wageSuppressed"] is False
    assert physician["aPct10"] == 120000  # a present percentile still comes through

    # Wage-suppressed via "*": flagged wageSuppressed, NOT topCoded.
    assert ag["aMedian"] is None and ag["hMean"] is None
    assert ag["wageSuppressed"] is True
    assert ag["topCoded"] is False

    # Employment suppressed via "**".
    assert manager["totalEmp"] is None
    assert manager["empSuppressed"] is True
    assert manager["aMean"] == 137000 and isinstance(manager["aMean"], int)


def test_build_dataset_validates_against_schema(schema):
    dataset = build_dataset(_synthetic_records())
    # Raises jsonschema.ValidationError on any contract violation.
    jsonschema.validate(instance=dataset, schema=schema)


def test_map_record_hourly_vs_annual_types():
    row = map_record(_synthetic_records()[0])
    for key in ("hMean", "hMedian", "hPct10", "hPct25", "hPct75", "hPct90", "jobsPer1000", "locQuotient"):
        assert row[key] is None or isinstance(row[key], float), key
    for key in ("totalEmp", "aMean", "aMedian", "aPct10", "aPct25", "aPct75", "aPct90"):
        assert row[key] is None or isinstance(row[key], int), key


# --------------------------------------------------------------------------- #
# Committed fixture guards the data contract
# --------------------------------------------------------------------------- #

def test_sample_fixture_validates_against_schema(sample_fixture_path, schema):
    with open(sample_fixture_path, encoding="utf-8") as fh:
        data = json.load(fh)
    jsonschema.validate(instance=data, schema=schema)
    assert data["meta"]["rowCount"] == len(data["rows"])
