#!/usr/bin/env sh

# shellcheck disable=SC2034
if command -v podman >/dev/null 2>&1; then
    BIOME="podman run --rm -v $PWD:/app:Z -w /app ghcr.io/biomejs/biome"
    BUN="podman run --rm -v $PWD:/app:Z -w /app docker.io/oven/bun:alpine bun"
    SHELLCHECK="podman run --rm -v $PWD:/mnt:Z docker.io/koalaman/shellcheck"
fi

if command -v biome >/dev/null 2>&1; then
    BIOME="biome"
fi

if command -v bun >/dev/null 2>&1; then
    BUN="bun"
fi

if command -v shellcheck >/dev/null 2>&1; then
    SHELLCHECK="shellcheck"
fi
