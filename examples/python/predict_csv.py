"""Upload a CSV directly to TabH2O.

For supervised tasks (classification, regression), rows where the target
column is empty are treated as test rows; the rest are training rows.

Usage:
    pip install requests
    export TABH2O_API_KEY=<your-key>
    python predict_csv.py path/to/data.csv <target_column> <task>

Example:
    python predict_csv.py customers.csv purchased classification
"""

from __future__ import annotations

import os
import sys

import requests

API_URL = "https://tabh2o.h2oai.com/api/v1/predict"
API_KEY = os.environ.get("TABH2O_API_KEY")
if not API_KEY:
    sys.exit("Set TABH2O_API_KEY (get one at https://tabh2o.h2oai.com)")

if len(sys.argv) < 4:
    sys.exit("Usage: python predict_csv.py <csv_path> <target_column> <task>")

csv_path, target_column, task = sys.argv[1], sys.argv[2], sys.argv[3]

with open(csv_path, "rb") as f:
    response = requests.post(
        API_URL,
        headers={"Authorization": f"Bearer {API_KEY}"},
        files={"file": (os.path.basename(csv_path), f, "text/csv")},
        data={"target_column": target_column, "task": task},
        timeout=120,
    )

response.raise_for_status()
result = response.json()

print(f"Task:          {result['metadata']['task']}")
print(f"Train rows:    {result['metadata']['train_rows']}")
print(f"Test rows:     {result['metadata']['test_rows']}")
print(f"Predictions:   {result.get('predictions')}")
if "probabilities" in result:
    print(f"Probabilities: {result['probabilities']}")
if "confidence_intervals" in result:
    print(f"CI (90%):      {result['confidence_intervals']}")
