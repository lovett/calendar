.PHONY: lint lint-css test watch

lint: lint-css lint-js

lint-js:
	biome lint calendar.js extras/sunrise.js

lint-css:
	biome lint calendar.css

test:
	cd test && bun test

watch:
	cd test && bun test --watch
