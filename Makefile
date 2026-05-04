SHELL := /bin/bash

update-marketplace:
	node .claude-plugin/update-marketplace.js

validate-marketplace:
	@shopt -s nullglob; \
	failed=0; \
	for manifest in agentic/plugins/*/.claude-plugin/plugin.json; do \
		echo "Validating $$manifest"; \
		if ! npx --yes -p ajv-cli -p ajv-formats ajv validate -s .claude-plugin/plugin-schema.json -d "$$manifest" --spec=draft2020 -c ajv-formats; then \
			failed=1; \
		fi; \
	done; \
	if ! node .claude-plugin/update-marketplace.js --check; then \
		failed=1; \
	fi; \
	exit $$failed
