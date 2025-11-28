#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")"

biome lint ../calendar.css
