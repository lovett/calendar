#!/usr/bin/env sh

set -eu

BIOME="test/node_modules/.bin/biome"
PROJECT_ROOT="$(dirname "$0")/../"

cd "$PROJECT_ROOT"

if [ ! -f "$BIOME" ]; then
   cd test
   bun install
fi

cd "$PROJECT_ROOT"

lint_css() {
    $BIOME lint calendar.css
}

lint_js() {
    $BIOME lint calendar.js extras/sunrise.js
}

lint_sh() {
    shellcheck scripts/*
}

case "${1:-all}" in
    --help)
        echo "Run language-specific linters to check code quality."
        ;;
    css)
        lint_css
        ;;
    js)
        lint_js
        ;;
    sh)
        lint_sh
        ;;
    all)
        lint_css
        lint_js
        lint_sh
        ;;
    *)
        echo "Unknown argument." >&2
        ;;
esac
