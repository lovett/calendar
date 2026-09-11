#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../"

. "scripts/vars.sh"

case "${1:-all}" in
    --help)
        echo "With no arguments, runs all unit tests."
        echo "With one argument, runs the specified suite."
        ;;
    all)
        $BUN install
        $BUN test --only-failures --bail --concurrent
        ;;
    *)
        $BUN install
        $BUN test --only-failures "$(basename "$@")"
        ;;
esac
