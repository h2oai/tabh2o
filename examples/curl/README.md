# curl examples

Set your API key once:

```bash
export TABH2O_API_KEY=<your-key>     # get one at https://tabh2o.h2oai.com
```

Then run any of the scripts below. They print the raw JSON response.

| Script | Task | Input format |
|---|---|---|
| [`classification.sh`](./classification.sh) | Classification | JSON body |
| [`regression.sh`](./regression.sh) | Regression | JSON body |
| [`timeseries.sh`](./timeseries.sh) | Time-series forecasting | CSV upload |
| [`feature_importance.sh`](./feature_importance.sh) | Classification with global feature importance | JSON body |

If you have `jq` installed, the scripts pretty-print the response.
