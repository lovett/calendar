#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

. "scripts/vars.sh"

can_skip() {
    EXT="${1:-}"
    CMD="${2:-}"
    NAME="${3:-}"

    if [ -z "${CMD:-}" ]; then
        echo "Skipping $NAME because it is not available"
        echo ""
        return 0
    fi

    # Checkout is pristine, or the all argument was used.
    [ -z "${CHANGED_FILES:-}" ] && return 1

    COUNT=$(git ls-files -m -o --exclude-standard "*$EXT" | wc -l)
    if [ "$COUNT" -gt 0 ]; then
        # At least one changed file. Cannot skip.
        return 1
    fi

    # No changed files
    echo "Skipping $EXT linting";
    return 0
}

lint_css() {
    can_skip ".css" "$BIOME" "biome" && return
    echo "Linting css assets with biome"
    $BIOME lint calendar.css
}

lint_js() {
    can_skip ".js" "$BIOME" "biome" && return
    echo "Linting js assets with biome"
    $BIOME lint calendar.js extras/sunrise.js
}

lint_sh() {
    can_skip ".sh" "$SHELLCHECK" "shellcheck" && return
    echo "Linting scripts with shellcheck"
    $SHELLCHECK scripts/*
    echo ""
}

lint_json() {
    can_skip ".json" "$BUN" "bun" && return
    echo "Linting json files with bun"
    $BUN check ./*.json test/*.json
    echo ""
}

lint_all() {
    lint_css
    lint_js
    lint_sh
    lint_json
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
    json)
        lint_json
        ;;
    sh)
        lint_sh
        ;;
    all)
        lint_all
        ;;
    *)
        CHANGED_FILES=$(git status --porcelain)
        lint_all
        ;;
esac
