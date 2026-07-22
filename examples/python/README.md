# Python examples

Standalone scripts that talk to the TabH2O API with the standard `requests` library.

```bash
pip install requests pandas
export TABH2O_API_KEY=<your-key>     # get one at https://tabh2o.h2oai.com
```

| Script | What it shows |
|---|---|
| [`predict_json.py`](./predict_json.py) | Classification + regression with inline JSON data |
| [`predict_csv.py`](./predict_csv.py) | CSV file upload (any task) |
| [`predict_pandas.py`](./predict_pandas.py) | Build the request from a pandas DataFrame |

All three only depend on `requests` (and `pandas` for the last one).

For classification and regression you can add `"feature_importance": true` to any payload to also get global per-feature importance scores (Integrated Gradients) in the response — see the [skill spec](../../agentic/skills/tabh2o/SKILL.md) for details.

## See also

- [TabH2O solves Titanic, no training needed](https://www.kaggle.com/code/jesucristo/tabh2o-solves-titanic-no-training-needed): end-to-end Kaggle notebook
- [`agentic/skills/tabh2o/SKILL.md`](../../agentic/skills/tabh2o/SKILL.md): the agent skill spec, with the full API reference
