---
name: tabh2o
description: Makes predictions on tabular data using the TabH2O foundation model API. Supports classification, regression (including timeseries forecasting), clustering, missing value imputation, and anomaly detection, with optional global feature importance for classification and regression. Send data as JSON or CSV, get results back.
version: 1.0.0
api_endpoints:
  - https://tabh2o.h2oai.com/api/v1/predict    # classification, regression, imputation
  - https://tabh2o.h2oai.com/api/v1/forecast   # timeseries regression (requires time_column)
  - https://tabh2o.h2oai.com/api/v1/explore     # unsupervised discovery: clustering, anomaly_detection
auth: Bearer API key (obtain at https://tabh2o.h2oai.com)
---

# TabH2O - Tabular Prediction API

**Keywords**: tabular data, classification, regression, timeseries, forecasting, clustering, imputation, anomaly detection, outlier detection, prediction, structured data, machine learning, foundation model, zero-shot, no-code ML, API, time_column, feature importance, feature attribution, explainability, integrated gradients

## What it does

TabH2O is a foundation model for tabular data. Supports these task types across three endpoints:

| Task | Description | Endpoint | Requires target? |
|------|-------------|----------|-----------------|
| `classification` | Predict categorical labels | `/api/v1/predict` | Yes |
| `regression` | Predict continuous values | `/api/v1/predict` | Yes |
| timeseries forecasting | Predict future values over time (regression + `time_column`) | `/api/v1/forecast` | Yes |
| `imputation` | Fill missing values (paid plans only) | `/api/v1/predict` | No |
| `clustering` | Group similar rows (paid plans only) | `/api/v1/explore` | No |
| `anomaly_detection` | Score rows by how anomalous they are (paid plans only) | `/api/v1/explore` | No |

Input via JSON arrays or a single CSV file. Classification and regression requests can additionally return **global feature importance** scores (Integrated Gradients) by setting `feature_importance: true`.

## API

Three endpoints share the same request/response format; pick by task:

- `POST https://tabh2o.h2oai.com/api/v1/predict` — per-row predictions: `classification`, `regression`, `imputation`. All require a `test` set; `target_column` is required for `classification`/`regression` (imputation has none).
- `POST https://tabh2o.h2oai.com/api/v1/forecast` — **timeseries forecasting** (regression over time). Requires a `target_column` and a `time_column`; `task` may be omitted (it is always regression). `time_column` is only accepted here.
- `POST https://tabh2o.h2oai.com/api/v1/explore` — **unsupervised** discovery (`clustering`, `anomaly_detection`). No target column; `test` is optional (omit it to operate on the training set itself).

Sending a task to the wrong endpoint returns `422 wrong_endpoint` telling you which one to use.

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
  "task": "classification"
}
```

Task-specific fields (`time_column`, `n_clusters`, `cluster_method`, `params`) are described in the table below; add them only for the tasks/endpoints that use them.

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `train.data` | array of arrays | Yes | Training rows |
| `train.columns` | array of strings | Yes | Column names for training data |
| `test.data` | array of arrays | classification/regression | Test rows (for imputation, the rows whose missing cells to fill). Optional for imputation, clustering, and anomaly_detection — omit to operate on the training set itself. |
| `test.columns` | array of strings | With `test` | Column names for test data |
| `task` | string | Yes (omit on `/forecast`) | One of: `classification`, `regression`, `imputation`, `clustering`, `anomaly_detection`. On `/api/v1/forecast` it may be omitted (always regression). |
| `target_column` | string | classification/regression | Name of the target column in `train.columns`. Only valid for `classification`/`regression`/forecasting (not `imputation`, `clustering`, or `anomaly_detection`). |
| `time_column` | string | Forecast | Name of the time/date column (any format `pd.to_datetime()` can parse). Enables timeseries forecasting — send the request to `/api/v1/forecast`, where it is **required**. Also accepted on `/api/v1/predict` with `task=regression` for backwards compatibility (deprecated); rejected on `/api/v1/explore`. |
| `n_clusters` | integer (2-1000) | Clustering (kmeans) | Number of clusters. Required for kmeans, ignored for dbscan. Only valid for `clustering`. |
| `cluster_method` | string | Optional | Clustering algorithm: `kmeans` (default) or `dbscan`. Only valid for `clustering`. |
| `params` | object | Optional | Server-side tuning knobs: `n_estimators` (1-128), `batch_size` (1-128). Not applicable to `anomaly_detection`. Sensible defaults if omitted. JSON requests only — not supported for CSV file uploads. |
| `feature_importance` | boolean | Optional | Set `true` to also return global per-feature importance scores (Integrated Gradients) alongside the predictions. `classification`/`regression` on `/api/v1/predict` only (not forecasting or unsupervised tasks); requires `target_column`; max 100 features. |

**Rules:**
- `classification`, `regression`, and `imputation` go to `/api/v1/predict`; `clustering` and `anomaly_detection` go to `/api/v1/explore`. Timeseries forecasting goes to `/api/v1/forecast`. The wrong pairing returns `422 wrong_endpoint`.
- Timeseries forecasting (`/api/v1/forecast`, regression over time): provide `time_column` (required there); `task` may be omitted. For backwards compatibility, `/api/v1/predict` also serves `task=regression` + `time_column` as a forecast (deprecated — prefer `/api/v1/forecast`).
- For `classification`/`regression`: `train.data` rows include the target value, `test.data` rows do not. `train.columns` includes the target, `test.columns` does not.
- For `imputation`: no target column; `test.data` rows should contain the null/missing cells to fill (and `test.columns` must match `train.columns`). `test` is optional — omit it to impute the training rows themselves.
- For `clustering` and `anomaly_detection` (`/explore`): `train.columns` and `test.columns` must match. No target column. `test` is optional — omit it to operate on the training set itself.
- For `anomaly_detection`: the response returns `anomaly_scores` (higher = more anomalous).
- `feature_importance: true` adds a `feature_importance` array to the response (see Responses). Classification and regression only; rejected with 422 for forecasting, unsupervised tasks, and datasets with more than 100 features. The computation runs synchronously in the same request, so allow a generous client timeout.
- Column order in `columns` must match the order of values in each `data` row.
- Cell values can be: string, number, boolean, or null.

### Option 2: CSV file upload

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | CSV file with header row |
| `task` | string | Yes | Task type (see above) |
| `target_column` | string | classification/regression | Name of the target column |
| `time_column` | string | Forecast | Time/date column. Enables timeseries forecasting; send the request to `/api/v1/forecast` (required there; deprecated compat on `/api/v1/predict` with `task=regression`; rejected on `/api/v1/explore`). |
| `n_clusters` | integer | Clustering (kmeans) | Number of clusters. Required for kmeans. |
| `cluster_method` | string | Optional | `kmeans` (default) or `dbscan`. |
| `feature_importance` | string | Optional | `true` to also return global feature importance (classification/regression only, max 100 features). |

Post `classification`/`regression`/`imputation` to `/api/v1/predict`, timeseries forecasting to `/api/v1/forecast`, and `clustering`/`anomaly_detection` to `/api/v1/explore` (same as JSON).
For classification/regression: rows where the target column is empty are test rows; the rest are training rows.
For clustering, imputation, and anomaly detection: all rows are used. For imputation, cells with missing values will be filled.
`params` is JSON-only — it is not supported for CSV file uploads.

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

**Classification or regression with `feature_importance: true` (200):** the usual fields, plus a `feature_importance` array:
```json
{
  "predictions": ["No", "Yes"],
  "probabilities": [[0.63, 0.37], [0.20, 0.80]],
  "feature_importance": [
    { "feature": "income", "importance": 0.71, "mean_abs_attribution": 0.165 },
    { "feature": "age", "importance": 0.29, "mean_abs_attribution": 0.068 }
  ],
  "metadata": { "task": "classification", "train_rows": 4, "test_rows": 2, "columns": 3, "time_ms": 1210 }
}
```
Global importance per feature, sorted descending. `importance` is the normalized share for ranking — shares sum to 1. `mean_abs_attribution` is the un-normalized mean |attribution| across the explained test rows, in model-output units (class probability for classification, target units for regression) — use it for absolute thresholds or comparisons across requests.

**Anomaly detection (200):**
```json
{
  "anomaly_scores": [0.12, 0.94, 0.08, 0.71],
  "metadata": { "task": "anomaly_detection", "train_rows": 200, "test_rows": 4, "columns": 6, "time_ms": 410 }
}
```
Higher `anomaly_scores` = more anomalous.

Only task-relevant fields are returned. `probabilities` for classification, `confidence_intervals` for regression, `imputed_data`/`imputed_columns`/`imputed_mask` for imputation, `anomaly_scores` for anomaly detection, `feature_importance` only when requested.

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

**Note:** Clustering, imputation, and anomaly detection are not available on the free tier. [Contact sales](https://h2oai.com/demo/) for access to these tasks.

## Privacy & anonymization

Data is **never stored** — processed in memory and discarded after the response. Nothing is logged, cached, or used for training.

You can fully anonymize data with zero impact on prediction quality:
- **Column names are arbitrary.** Rename to `c1`, `c2`, etc.
- **Categorical values can be mapped to integers.** The model learns from patterns, not label semantics.
- **Numeric values need no changes.**

## Usage guidelines for agents

1. **Choose the right task type and endpoint.** Classification (categories), regression (continuous numbers), and imputation (fill missing values) go to `/api/v1/predict`. Timeseries forecasting (regression with a `time_column`) goes to `/api/v1/forecast`. Clustering (discover groups) and anomaly_detection (flag outliers) go to `/api/v1/explore`.
2. **Include enough training data.** More rows = better predictions. Aim for 20+ training rows for supervised tasks.
3. **Keep columns consistent.** Train and test must have the same feature columns.
4. **Handle errors gracefully.** On 429, back off and retry. On 503/504, retry with exponential backoff. On 422, fix the request.
5. **Anonymize sensitive data.** Rename columns, map categories to integers.
6. **Interpret results in context.** Use `probabilities` for classification confidence, `confidence_intervals` for regression uncertainty, `imputed_mask` to see what was filled in.
7. **Explain predictions when the user asks "why".** For classification/regression, set `feature_importance: true` to get a ranked list of which features drive the model — useful for feature selection, sanity checks, and explaining results. Expect the request to take longer.

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
curl -s -X POST https://tabh2o.h2oai.com/api/v1/forecast \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -F file=@sales.csv \
  -F target_column=sales \
  -F time_column=date
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
curl -s -X POST https://tabh2o.h2oai.com/api/v1/explore \
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

## Example: Anomaly detection (JSON)

Score each test row by how anomalous it looks relative to the training rows.
Omit `test` to score the training set against itself.

```bash
curl -s -X POST https://tabh2o.h2oai.com/api/v1/explore \
  -H "Authorization: Bearer $TABH2O_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "train": {
      "data": [[25,50000,1],[30,60000,3],[22,45000,0],[35,70000,8],[28,55000,2]],
      "columns": ["age","income","experience"]
    },
    "test": {
      "data": [[27,52000,2],[99,5000000,40]],
      "columns": ["age","income","experience"]
    },
    "task": "anomaly_detection"
  }'
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
