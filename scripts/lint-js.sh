#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")"

biome lint ../calendar.js ../extras/sunrise.js
