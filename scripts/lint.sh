#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

BIOME_IMAGE="ghcr.io/biomejs/biome"

if ! podman image exists "$BIOME_IMAGE"; then
    echo "Pulling $BIOME_IMAGE"
    podman pull -q "$BIOME_IMAGE"
fi

BIOME="podman run --rm -it -v $PWD:/app:Z -w /app $BIOME_IMAGE"

if ! rpm -q ShellCheck >/dev/null 2>&1; then
  sudo dnf install -y ShellCheck
fi

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
