#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")"

echo "CSS"
./lint-css.sh

echo ""

echo "JS"
./lint-js.sh
