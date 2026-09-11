# shellcheck disable=SC2034
BIOME_IMAGE="ghcr.io/biomejs/biome"
BIOME="podman run --rm -v $PWD:/app:Z -w /app $BIOME_IMAGE"
BUN_IMAGE="docker.io/oven/bun:alpine"
BUN="podman run --rm -v $PWD:/app:Z -w /app/test $BUN_IMAGE bun"
