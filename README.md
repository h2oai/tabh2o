<p align="center">
  <a href="https://tabh2o.h2oai.com">
    <img src="https://tabh2o-public.cdn.h2oai.com/assets/logos/tabh2o-80.png" alt="TabH2O" height="64" />
  </a>
</p>

<h1 align="center">TabH2O</h1>

<p align="center">
  A foundation model for tabular data. One API covers classification, regression, time-series forecasting, clustering, and missing-value imputation. No fitting step on your side.
</p>

<p align="center">
  <a href="https://tabh2o.h2oai.com">Website</a> ·
  <a href="https://tabh2o.h2oai.com/docs">API Docs</a> ·
  <a href="https://tabh2o.h2oai.com/playground">Playground</a> ·
  <a href="https://h2o.ai/blog/2026/introducing-tabh2o/">Blog</a>
</p>

---

This is the public companion repo for TabH2O. You will find here:

- The agent skill spec (`agentic/skills/tabh2o/SKILL.md`) for Claude Code, pi, and similar harnesses
- A Claude Code plugins marketplace at the repo root (`.claude-plugin/marketplace.json`)
- The Excel and Google Sheets integrations (`integrations/`)
- Runnable curl and Python examples (`examples/`)
- Links to the hosted service, the full docs, the blog post, and a Kaggle notebook

Issues and pull requests are welcome.

## What it does

TabH2O is a foundation model trained on millions of synthetic datasets. You give it a small labeled training set and an unlabeled test set; it returns predictions a few seconds later.

| Task | Endpoint | Example |
|---|---|---|
| `classification` | `/api/v1/predict` | Will this customer churn? |
| `regression` | `/api/v1/predict` | What price will this house sell for? |
| Timeseries forecasting | `/api/v1/forecast` | What will sales look like next week? |
| `imputation` (paid plans) | `/api/v1/predict` | Fill in the missing cells in this table. |
| `clustering` (paid plans) | `/api/v1/explore` | Which customers behave alike? |

The [blog post](https://h2o.ai/blog/2026/introducing-tabh2o/) explains the why and the how.

## Quickstart

1. Get a free API key at <https://tabh2o.h2oai.com>.
2. Send a request:

   ```bash
   export TABH2O_API_KEY=<your-key>

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

3. More examples are in [`examples/`](./examples). The full reference is at [tabh2o.h2oai.com/docs](https://tabh2o.h2oai.com/docs).

## Examples and integrations

A community notebook walks through the Titanic dataset end to end: [TabH2O solves Titanic, no training needed](https://www.kaggle.com/code/jesucristo/tabh2o-solves-titanic-no-training-needed) on Kaggle.

In this repo:

- [`examples/curl/`](./examples/curl): one runnable shell script per task type
- [`examples/python/`](./examples/python): plain `requests`, a CSV-upload script, and a pandas helper
- [`agentic/skills/tabh2o/SKILL.md`](./agentic/skills/tabh2o/SKILL.md): agent skill in the [agentskills.io](https://agentskills.io) format. Drops into Claude Code, pi, and other harnesses.
- [`integrations/excel/`](./integrations/excel) and [`integrations/gsheets/`](./integrations/gsheets): the spreadsheet add-ins

## Claude Code marketplace

This repo doubles as a [Claude Code plugins marketplace](https://code.claude.com/docs/en/plugins). Install it once, then pull in any TabH2O skill or plugin from inside Claude Code:

```
/plugin marketplace add h2oai/tabh2o
/plugin install tabh2o@tabh2o
```

The same skill is also usable standalone in any harness that reads the [agentskills.io](https://agentskills.io) format — the marketplace is just one delivery channel.

## Free tier

| Limit | Value |
|---|---|
| Requests per minute | 2 |
| Requests per day | 20 |
| Requests per month | 500 |
| Tasks | Classification, regression |
| Max rows per request | 100,000 |
| Max columns | 100 |
| Max payload | 50 MB |

For higher limits [contact us](https://h2oai.com/demo/).

## Privacy

Data is processed in memory and discarded after the response. Nothing is stored, logged, cached, or used for training. Column names and category labels can be replaced with arbitrary identifiers (`c1`, `c2`, ...) without changing the predictions. Details in [`agentic/skills/tabh2o/SKILL.md`](./agentic/skills/tabh2o/SKILL.md#privacy--anonymization).

## Contributing

Issues and pull requests on the public assets in this repo are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Apache 2.0. See [LICENSE](./LICENSE).
