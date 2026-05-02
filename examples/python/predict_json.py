"""Classification and regression with inline JSON data.

Usage:
    pip install requests
    export TABH2O_API_KEY=<your-key>
    python predict_json.py
"""

from __future__ import annotations

import os
import sys

import requests

API_URL = "https://tabh2o.h2oai.com/api/v1/predict"
API_KEY = os.environ.get("TABH2O_API_KEY")
if not API_KEY:
    sys.exit("Set TABH2O_API_KEY (get one at https://tabh2o.h2oai.com)")


def predict(payload: dict) -> dict:
    response = requests.post(
        API_URL,
        headers={"Authorization": f"Bearer {API_KEY}"},
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


# --- Classification --------------------------------------------------------

classification = predict(
    {
        "train": {
            "data": [
                [25, 50000, 1, "Yes"],
                [30, 60000, 3, "No"],
                [22, 45000, 0, "Yes"],
                [35, 70000, 8, "No"],
                [28, 55000, 2, "Yes"],
                [40, 80000, 10, "No"],
            ],
            "columns": ["age", "income", "experience", "purchased"],
        },
        "test": {
            "data": [[27, 52000, 2], [38, 75000, 7]],
            "columns": ["age", "income", "experience"],
        },
        "target_column": "purchased",
        "task": "classification",
    }
)
print("Classification predictions:", classification["predictions"])
print("Class probabilities:       ", classification["probabilities"])

# --- Regression ------------------------------------------------------------

regression = predict(
    {
        "train": {
            "data": [
                [1200, 2, 1, 250000],
                [1800, 3, 0, 350000],
                [2400, 4, 1, 500000],
                [900, 1, 0, 180000],
                [1500, 3, 1, 310000],
            ],
            "columns": ["sqft", "bedrooms", "garage", "price"],
        },
        "test": {
            "data": [[1600, 3, 1], [2000, 4, 0]],
            "columns": ["sqft", "bedrooms", "garage"],
        },
        "target_column": "price",
        "task": "regression",
    }
)
print("Regression predictions:    ", regression["predictions"])
print("90% confidence intervals:  ", regression["confidence_intervals"])
