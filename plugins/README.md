# TabH2O Spreadsheet Plugins

Office add-ins that bring TabH2O predictions into Excel and Google Sheets. Both plugins do the same thing (pick a sheet, configure target and task, predictions get written back into the empty target cells), they just use platform-native APIs.

## Install

For end users, the easiest path is the install buttons on the [hosted plugins page](https://tabh2o.h2oai.com/docs#plugins). The instructions below are for sideloading from this repo during development.

### Excel

- Type: Office Task Pane add-in (Office Open XML manifest v1.1)
- Files: [`excel/manifest.xml`](./excel/manifest.xml), [`excel/taskpane.html`](./excel/taskpane.html)
- Sideload: in Excel, *Insert → Office Add-ins → Upload My Add-in*, select `manifest.xml`. Microsoft's [sideload guide](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-office-add-ins-for-testing) has the per-platform walkthrough.

### Google Sheets

- Type: Google Apps Script container-bound script with a sidebar
- Files: [`gsheets/Code.gs`](./gsheets/Code.gs), [`gsheets/sidebar.html`](./gsheets/sidebar.html)
- Install: in a Google Sheet, *Extensions → Apps Script*. Paste `Code.gs` into the script file and create a new HTML file `sidebar.html` from this repo. Save, reload the sheet, and a *TabH2O* menu appears.

## How they work

### Excel (`excel/`)

- Runs in-browser inside Excel via `office.js`
- `Excel.run()` calls read ranges and write predictions
- API key stored per-document in `Office.context.document.settings`
- Calls `POST /api/v1/predict` (relative URL, same origin as `tabh2o.h2oai.com`)
- Permissions: `ReadWriteDocument`

### Google Sheets (`gsheets/`)

- Hybrid: `Code.gs` runs server-side on Google's infrastructure, `sidebar.html` runs in a sandboxed iframe
- A small `postMessage` bridge in `Code.gs` (`openSidebar()`) routes calls from the iframe to a whitelisted set of Apps Script functions: `getSheetNames`, `readSheetData`, `writePredictions`, `callPredict`, `loadApiKey`
- API key stored per-user in `PropertiesService.getUserProperties()`
- Calls `POST https://tabh2o.h2oai.com/api/v1/predict` server-side via `UrlFetchApp.fetch()`

## API integration

Both plugins call `POST https://tabh2o.h2oai.com/api/v1/predict` with `Authorization: Bearer <api-key>` and a JSON body:

```json
{
  "train": { "data": [[...], ...], "columns": ["col1", "target"] },
  "test":  { "data": [[...], ...], "columns": ["col1"] },
  "target_column": "target",
  "task": "classification"
}
```

The plugins read `predictions` from the response. Only `classification` and `regression` are supported in the spreadsheet UI.

## Shared behavior

The two UI files (`taskpane.html` and `sidebar.html`) implement the same logic:

- Type detection: column heuristic. `>50%` numeric → Numeric; `>50%` parseable as Date → Time; otherwise Categorical.
- Task auto-detection: a Categorical target or `≤2` distinct values → classification; otherwise regression.
- Target column eligibility: must contain at least one empty cell. Those cells become the test rows.
- Row split: rows with a non-empty target are training; rows with an empty target are test.
- Prediction write: purple bold (`#7C3AED`) into the originally empty target cells.
- Status states: `idle`, `running` (animated), `success`, `error`.
- Error display: info button reveals the full error; click to copy.

## Development notes

- No build step. Files are served as-is, no bundling, no transpilation.
- Vanilla JS only. No frameworks, no dependencies. Keep it that way.
- Keep both UIs in sync. When you change shared logic or styling, apply the change to both `taskpane.html` and `sidebar.html`. The CSS and most of the JS are duplicated by design.
- Platform divergence is intentional. Excel uses `Excel.run()` plus a relative `fetch()`; Google Sheets uses the `postMessage` bridge plus server-side `UrlFetchApp`. Don't try to unify them.
- Version string lives in four places. Bump them together when cutting a release:
  - `excel/manifest.xml` (`<Version>`)
  - `excel/taskpane.html` (`PLUGIN_VERSION`)
  - `gsheets/sidebar.html` (`PLUGIN_VERSION`)
  - `gsheets/Code.gs` (`showAbout`)

## Styling

Fonts are DM Sans for headings and DM Mono for code, both loaded from Google Fonts. Accent color is `#FFDD00` (H2O Sunshine Yellow). Logos are at `https://tabh2o-public.cdn.h2oai.com/assets/logos/tabh2o-{32,80}.png`.

## License

Apache 2.0. See [../LICENSE](../LICENSE).
