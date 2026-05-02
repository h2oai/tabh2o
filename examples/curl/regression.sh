#!/usr/bin/env bash
# Regression — predict house price from sqft / bedrooms / garage.
set -euo pipefail
: "${TABH2O_API_KEY:?Set TABH2O_API_KEY (get one at https://tabh2o.h2oai.com)}"

curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "train": {
      "data": [
        [1200, 2, 1, 250000],
        [1800, 3, 0, 350000],
        [2400, 4, 1, 500000],
        [ 900, 1, 0, 180000],
        [1500, 3, 1, 310000]
      ],
      "columns": ["sqft", "bedrooms", "garage", "price"]
    },
    "test": {
      "data": [
        [1600, 3, 1],
        [2000, 4, 0]
      ],
      "columns": ["sqft", "bedrooms", "garage"]
    },
    "target_column": "price",
    "task": "regression"
  }' | { command -v jq >/dev/null && jq . || cat; }
