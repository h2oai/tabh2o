#!/usr/bin/env bash
# Classification — predict whether a customer purchased.
set -euo pipefail
: "${TABH2O_API_KEY:?Set TABH2O_API_KEY (get one at https://tabh2o.h2oai.com)}"

curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "train": {
      "data": [
        [25, 50000, 1, "Yes"],
        [30, 60000, 3, "No"],
        [22, 45000, 0, "Yes"],
        [35, 70000, 8, "No"],
        [28, 55000, 2, "Yes"],
        [40, 80000, 10, "No"]
      ],
      "columns": ["age", "income", "experience", "purchased"]
    },
    "test": {
      "data": [
        [27, 52000, 2],
        [38, 75000, 7]
      ],
      "columns": ["age", "income", "experience"]
    },
    "target_column": "purchased",
    "task": "classification"
  }' | { command -v jq >/dev/null && jq . || cat; }
