#!/usr/bin/env bash
# Time-series forecasting — empty target rows at the end of the CSV are
# treated as the forecast horizon. Specify `time_column` to enable
# timeseries-aware regression.
set -euo pipefail
: "${TABH2O_API_KEY:?Set TABH2O_API_KEY (get one at https://tabh2o.h2oai.com)}"

CSV=$(mktemp --suffix=.csv)
cat > "$CSV" <<EOF
date,store,sales
2025-01-01,A,120
2025-01-02,A,135
2025-01-03,A,98
2025-01-04,A,142
2025-01-05,A,155
2025-01-06,A,
2025-01-07,A,
EOF

curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -F "file=@$CSV;type=text/csv" \
  -F target_column=sales \
  -F time_column=date \
  -F task=regression | { command -v jq >/dev/null && jq . || cat; }

rm -f "$CSV"
