#!/usr/bin/env sh

set -eu

# Run from repository root
cd "$(dirname "$0")/../"

. "scripts/vars.sh"

$BUN test --only-failures --bail --concurrent
