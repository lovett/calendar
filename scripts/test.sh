#!/usr/bin/env sh
#shellcheck disable=SC2068 # re-split of $@ is intentional

set -eu

# Run from repository root
cd "$(dirname "$0")/../"

. "scripts/vars.sh"


$BUN test --only-failures --concurrent $@
