#!/usr/bin/env sh

set -eu

# Run from repository root
cd "$(dirname "$0")/../"

. "scripts/vars.sh"

if [ "${1-}" = "--help" ]; then
    echo "With no arguments, runs all unit tests."
    echo "With one argument, runs the specified suite."
    exit
fi

$BUN test --only-failures --bail --concurrent "$(basename "$@")"
