"""Shared pytest fixtures + import wiring for the pipeline tests.

Walks up from this file to find the repo root (the directory containing
``resources/data/schema.json``), then puts ``tools/`` on ``sys.path`` so tests
can do ``from convert_oews import ...``. This runs at conftest import time,
before any test module is collected, so the import in the test file resolves.
"""

import json
import os
import sys

import pytest


def _find_repo_root(start):
    """Ascend from *start* until we find resources/data/schema.json."""
    d = os.path.abspath(start)
    while True:
        if os.path.isfile(os.path.join(d, "resources", "data", "schema.json")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise RuntimeError(
                "Could not locate repo root: resources/data/schema.json not found "
                f"walking up from {start!r}"
            )
        d = parent


REPO_ROOT = _find_repo_root(os.path.dirname(__file__))
TOOLS_DIR = os.path.join(REPO_ROOT, "tools")
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)


@pytest.fixture(scope="session")
def repo_root():
    return REPO_ROOT


@pytest.fixture(scope="session")
def schema_path():
    return os.path.join(REPO_ROOT, "resources", "data", "schema.json")


@pytest.fixture(scope="session")
def schema(schema_path):
    with open(schema_path, encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="session")
def sample_fixture_path():
    return os.path.join(REPO_ROOT, "tests", "fixtures", "tx_oews.sample.json")
