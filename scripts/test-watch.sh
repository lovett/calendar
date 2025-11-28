#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/test"
bun test --watch
