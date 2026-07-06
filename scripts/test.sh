#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../test"

case "${1:-all}" in
    --help)
        echo "With no arguments, runs all unit tests."
        echo "With one argument, runs the specified suite."
        ;;
    all)
        bun test --bail --concurrent
        ;;
    *)
        bun test "$(basename "$@")"
        ;;
esac
