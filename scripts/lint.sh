#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

. "scripts/vars.sh"

lint_css() {
    $BIOME lint calendar.css
}

lint_js() {
    $BIOME lint calendar.js extras/sunrise.js
}

lint_sh() {
    shellcheck -s sh scripts/*
}

lint_json() {
    if command -v "jq" > /dev/null 2>&1; then
        jq empty < biome.json
        jq empty < test/package.json
    else
        echo "jq is not installed"
        exit 1
    fi
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
    json)
        lint_json
        ;;
    all)
        lint_css
        lint_js
        lint_sh
        lint_json
        ;;
    *)
        echo "Unknown argument." >&2
        ;;
esac
