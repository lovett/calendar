.PHONY: lint test watch

lint:
	biome lint calendar.js || true

test:
	cd test && bun test

watch:
	cd test && bun test --watch
