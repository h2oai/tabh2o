# Contributing to TabH2O

This repo holds the public-facing assets: the agent skill, the Claude Code plugins marketplace, the Excel and Google Sheets integrations, runnable examples, and the README. The model itself, the training code, and the web app live in a private repository.

## Issues, questions, ideas

Open an [issue](../../issues). The most useful reports show what you tried (a request body, a snippet, or a screenshot), what you expected, and what actually happened. Please mention which asset is involved: the API, one of the plugins, the skill, an example, or the docs.

If real data is involved, describe its shape (roughly how many rows and columns, what types) rather than pasting it.

## Pull requests

PRs are welcome on:

- `agentic/skills/tabh2o/SKILL.md` (and any future skills or plugins under `agentic/`)
- `.claude-plugin/marketplace.json` (regenerated via `make update-marketplace`)
- `integrations/excel/` and `integrations/gsheets/`
- `examples/`
- The README and this file

Before you open one:

1. For non-trivial changes, file an issue first so we can agree on direction before code is written.
2. Keep the PR focused. One concern per PR.
3. Test integration changes locally. The [integrations README](./integrations/README.md) has sideload and paste-in instructions.
4. By submitting a PR you agree to license your contribution under [Apache 2.0](./LICENSE).

## What lives elsewhere

- Bugs in the model, the API service, or the web app: still file them here, we'll triage internally.
- The full API documentation: canonical source is <https://tabh2o.h2oai.com/docs>, this repo links to it.
- Account, billing, or quota issues: email <support@h2o.ai> or [contact sales](https://h2oai.com/demo/).

## Code of conduct

Be kind and assume good faith. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## Security

Found a security issue? Please don't open a public issue. Email <security@h2o.ai> instead.
