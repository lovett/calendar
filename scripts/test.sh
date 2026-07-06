#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

BUN_IMAGE="oven/bun:alpine"

if ! podman image exists "$BUN_IMAGE"; then
    echo "Pulling $BUN_IMAGE"
    podman pull -q "$BUN_IMAGE"
fi

BUN="podman run --rm -it -v $PWD:/app:Z -w /app/test $BUN_IMAGE bun"

case "${1:-all}" in
    --help)
        echo "With no arguments, runs all unit tests."
        echo "With one argument, runs the specified suite."
        ;;
    all)
        $BUN install
        $BUN test --bail --concurrent
        ;;
    *)
        $BUN install
        $BUN test "$(basename "$@")"
        ;;
esac
