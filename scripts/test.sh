#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../test"

if [ "$#" -lt 1 ]; then
    bun test
else
    bun test "$@"
fi
