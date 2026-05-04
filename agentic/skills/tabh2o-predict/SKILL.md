---
name: tabh2o-predict
description: Makes predictions on tabular data using the TabH2O foundation model API. Supports classification, regression (including timeseries forecasting), clustering, and missing value imputation. Send data as JSON or CSV, get results back.
version: 1.0.0
api_endpoint: https://tabh2o.h2oai.com/api/v1/predict
auth: Bearer API key (obtain at https://tabh2o.h2oai.com)
---

# TabH2O - Tabular Prediction API

**Keywords**: tabular data, classification, regression, timeseries, forecasting, clustering, imputation, prediction, structured data, machine learning, foundation model, zero-shot, no-code ML, API, time_column

## What it does

TabH2O is a foundation model for tabular data. Supports four task types:

| Task | Description | Requires target? |
|------|-------------|-----------------|
| `classification` | Predict categorical labels | Yes |
| `regression` | Predict continuous values (add `time_column` for timeseries) | Yes |
| `clustering` | Group similar rows (paid plans only) | No |
| `imputation` | Fill missing values (paid plans only) | No |

Input via JSON arrays or a single CSV file.

## API

**Endpoint:** `POST https://tabh2o.h2oai.com/api/v1/predict`

**Auth:** `Authorization: Bearer <API_KEY>`

Accepts two content types:
- `application/json` — inline data as arrays
- `multipart/form-data` — CSV file upload

### Option 1: JSON request body

**Content-Type:** `application/json`

```json
{
  "train": {
    "data": [[val, val, ...], ...],
    "columns": ["col1", "col2", ..., "target_col"]
  },
  "test": {
    "data": [[val, val, ...], ...],
    "columns": ["col1", "col2", ...]
  },
  "target_column": "target_col",
  "task": "classification",
  "time_column": "date_col",
  "n_clusters": 5,
  "cluster_method": "kmeans"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `train.data` | array of arrays | Yes | Training rows |
| `train.columns` | array of strings | Yes | Column names for training data |
| `test.data` | array of arrays | Yes | Test rows |
| `test.columns` | array of strings | Yes | Column names for test data |
| `task` | string | Yes | One of: `classification`, `regression`, `clustering`, `imputation` |
| `target_column` | string | Supervised tasks | Name of the target column in `train.columns` |
| `time_column` | string | Optional | Name of the time/date column. Enables timeseries forecasting (regression only). Any format `pd.to_datetime()` can parse. |
| `n_clusters` | integer (2-1000) | Clustering (kmeans) | Number of clusters. Required for kmeans, ignored for dbscan. |
| `cluster_method` | string | Optional | Clustering algorithm: `kmeans` (default) or `dbscan`. |

**Rules:**
- For supervised tasks (`classification`, `regression`): `train.data` rows include the target value, `test.data` rows do not. `train.columns` includes the target, `test.columns` does not.
- For unsupervised tasks (`clustering`, `imputation`): `train.columns` and `test.columns` must match. No target column needed.
- For `imputation`: test data should contain null/missing values to be filled.
- Column order in `columns` must match the order of values in each `data` row.
- Cell values can be: string, number, boolean, or null.

### Option 2: CSV file upload

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | CSV file with header row |
| `task` | string | Yes | Task type (see above) |
| `target_column` | string | Supervised tasks | Name of the target column |
| `time_column` | string | Optional | Name of the time/date column (enables timeseries forecasting, regression only) |
| `n_clusters` | integer | Clustering (kmeans) | Number of clusters. Required for kmeans. |
| `cluster_method` | string | Optional | `kmeans` (default) or `dbscan`. |

For supervised tasks: rows where the target column is empty are test rows; the rest are training rows.
For unsupervised tasks: all rows are used. For imputation, cells with missing values will be filled.

### Responses

**Classification (200):**
```json
{
  "predictions": ["Yes", "No"],
  "probabilities": [[0.82, 0.18], [0.35, 0.65]],
  "metadata": { "task": "classification", "train_rows": 100, "test_rows": 2, "columns": 5, "time_ms": 245 }
}
```

**Regression (200):**
```json
{
  "predictions": [52000.0, 75000.0],
  "confidence_intervals": [[45000, 59000], [68000, 82000]],
  "metadata": { "task": "regression", "train_rows": 100, "test_rows": 2, "columns": 5, "time_ms": 312 }
}
```

**Regression with time_column (200):**
```json
{
  "predictions": [161.2, 148.7],
  "confidence_intervals": [[142.0, 180.4], [128.5, 168.9]],
  "metadata": { "task": "regression", "train_rows": 50, "test_rows": 2, "columns": 3, "time_ms": 380 }
}
```

**Clustering (200):**
```json
{
  "predictions": [0, 1, 0, 2, 1],
  "metadata": { "task": "clustering", "algorithm": "kmeans", "train_rows": 100, "test_rows": 5, "columns": 3, "n_clusters": 3, "time_ms": 520 }
}
```

**Imputation (200):**
```json
{
  "imputed_data": [[25, 50000, 8], [30, 52000, 7]],
  "imputed_columns": ["age", "income", "score"],
  "imputed_mask": [[false, false, false], [false, true, false]],
  "metadata": { "task": "imputation", "train_rows": 50, "test_rows": 2, "columns": 3, "columns_imputed": 1, "time_ms": 890 }
}
```

Only task-relevant fields are returned. `probabilities` for classification, `confidence_intervals` for regression, `imputed_data`/`imputed_columns`/`imputed_mask` for imputation.

### Error responses

| Status | Error code | Meaning |
|--------|-----------|---------|
| 401 | `invalid_api_key` | Missing, invalid, or revoked API key |
| 422 | `validation_error` | Bad request body, data too large, wrong format |
| 429 | `rate_limit_exceeded` | Too many requests per minute — wait and retry |
| 429 | `quota_exceeded` | Daily or monthly quota reached |
| 503 | `service_unavailable` | Backend temporarily down — retry with backoff |
| 504 | `timeout` | Inference timed out — try a smaller dataset |

### Limits (free tier)

| Limit | Value |
|-------|-------|
| Requests/minute | 2 |
| Requests/day | 20 |
| Requests/month | 500 |
| Available tasks | Classification, Regression |
| Max rows per request | 100,000 |
| Max columns | 100 |
| Max payload | 50 MB |

**Note:** Clustering and imputation are not available on the free tier. [Contact sales](https://h2oai.com/demo/) for access to unsupervised tasks.

## Privacy & anonymization

Data is **never stored** — processed in memory and discarded after the response. Nothing is logged, cached, or used for training.

You can fully anonymize data with zero impact on prediction quality:
- **Column names are arbitrary.** Rename to `c1`, `c2`, etc.
- **Categorical values can be mapped to integers.** The model learns from patterns, not label semantics.
- **Numeric values need no changes.**

## Usage guidelines for agents

1. **Choose the right task type.** Classification for categories, regression for continuous numbers (add `time_column` for forecasting with dates), clustering to discover groups, imputation to fill missing values.
2. **Include enough training data.** More rows = better predictions. Aim for 20+ training rows for supervised tasks.
3. **Keep columns consistent.** Train and test must have the same feature columns.
4. **Handle errors gracefully.** On 429, back off and retry. On 503/504, retry with exponential backoff. On 422, fix the request.
5. **Anonymize sensitive data.** Rename columns, map categories to integers.
6. **Interpret results in context.** Use `probabilities` for classification confidence, `confidence_intervals` for regression uncertainty, `imputed_mask` to see what was filled in.

## Example: Classification (JSON)

```bash
curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "train": {
      "data": [[25,50000,1,"Yes"],[30,60000,3,"No"],[22,45000,0,"Yes"],[35,70000,8,"No"],[28,55000,2,"Yes"],[40,80000,10,"No"]],
      "columns": ["age","income","experience","purchased"]
    },
    "test": {
      "data": [[27,52000,2],[38,75000,7]],
      "columns": ["age","income","experience"]
    },
    "target_column": "purchased",
    "task": "classification"
  }'
```

## Example: Regression (JSON)

```bash
curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "train": {
      "data": [[1200,2,1,250000],[1800,3,0,350000],[2400,4,1,500000],[900,1,0,180000],[1500,3,1,310000]],
      "columns": ["sqft","bedrooms","garage","price"]
    },
    "test": {
      "data": [[1600,3,1],[2000,4,0]],
      "columns": ["sqft","bedrooms","garage"]
    },
    "target_column": "price",
    "task": "regression"
  }'
```

## Example: Timeseries (CSV)

```
date,store,sales
2025-01-01,A,120
2025-01-02,A,135
2025-01-03,A,98
2025-01-04,A,142
2025-01-05,A,155
2025-01-06,A,
2025-01-07,A,
```

```bash
curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -F file=@sales.csv \
  -F target_column=sales \
  -F time_column=date \
  -F task=regression
```

## Example: Clustering (CSV)

```
age,income,spending_score
19,15000,39
21,15000,81
20,16000,6
23,16000,77
31,17000,40
```

```bash
curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -F file=@customers.csv \
  -F task=clustering \
  -F n_clusters=3
```

## Example: Imputation (CSV)

```
age,income,satisfaction,city
25,50000,8,NYC
30,,7,LA
,45000,9,NYC
28,55000,,LA
```

```bash
curl -s -X POST https://tabh2o.h2oai.com/api/v1/predict \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -F file=@survey.csv \
  -F task=imputation
```

## Example: Python (file upload)

```python
import requests

response = requests.post(
    "https://tabh2o.h2oai.com/api/v1/predict",
    headers={"Authorization": f"Bearer {API_KEY}"},
    files={"file": ("data.csv", open("data.csv", "rb"))},
    data={
        "target_column": "purchased",
        "task": "classification",
    },
)
print(response.json())
```
