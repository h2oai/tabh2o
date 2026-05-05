"""Build a TabH2O request from a pandas DataFrame.

Pattern:
    1. Split your DataFrame into a labeled `train_df` (with the target column)
       and an unlabeled `test_df` (without it).
    2. Convert each to {"data": ..., "columns": ...} via `to_payload()`.
    3. POST.

Usage:
    pip install requests pandas
    export TABH2O_API_KEY=<your-key>
    python predict_pandas.py
"""

from __future__ import annotations

import os
import sys

import pandas as pd
import requests

API_URL = "https://tabh2o.h2oai.com/api/v1/predict"
API_KEY = os.environ.get("TABH2O_API_KEY")
if not API_KEY:
    sys.exit("Set TABH2O_API_KEY (get one at https://tabh2o.h2oai.com)")


def to_payload(df: pd.DataFrame) -> dict:
    """Convert a DataFrame into the {"data": ..., "columns": ...} shape TabH2O expects."""
    # `where(notna, None)` replaces NaN with None so JSON gets `null`.
    safe = df.where(df.notna(), None)
    return {"data": safe.values.tolist(), "columns": list(df.columns)}


# Toy dataset
train_df = pd.DataFrame(
    {
        "age":         [25, 30, 22, 35, 28, 40],
        "income":      [50000, 60000, 45000, 70000, 55000, 80000],
        "experience":  [1, 3, 0, 8, 2, 10],
        "purchased":   ["Yes", "No", "Yes", "No", "Yes", "No"],
    }
)
test_df = pd.DataFrame(
    {
        "age":        [27, 38],
        "income":     [52000, 75000],
        "experience": [2, 7],
    }
)

response = requests.post(
    API_URL,
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "train": to_payload(train_df),
        "test": to_payload(test_df),
        "target_column": "purchased",
        "task": "classification",
    },
    timeout=60,
)
response.raise_for_status()
result = response.json()

# Drop predictions back into the test DataFrame for easy inspection.
test_df["purchased_pred"] = result["predictions"]
test_df["confidence"] = [max(p) for p in result["probabilities"]]

print(test_df.to_string(index=False))
