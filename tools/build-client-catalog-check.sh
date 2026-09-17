#!/usr/bin/env bash
set -euo pipefail
root="$(dirname "$(realpath "$0")")"
client="$(realpath "${1:?Bitcadia64 checkout required}")"
output="${2:?Helper output path required}"
zig build-exe -O ReleaseSafe \
  --dep registry --dep registry_index -Mroot="$root/client-catalog-check.zig" \
  --dep provider_example --dep provider_schema -Mregistry="$client/tools/library-importer/src/registry.zig" \
  --dep registry --dep registry_index_example --dep registry_index_schema -Mregistry_index="$client/tools/library-importer/src/registry_index.zig" \
  -Mprovider_example="$client/schemas/examples/external-xdelta-registry.json" \
  -Mprovider_schema="$client/schemas/mod-registry.schema.json" \
  -Mregistry_index_example="$client/schemas/examples/mod-registry-index.json" \
  -Mregistry_index_schema="$client/schemas/mod-registry-index.schema.json" \
  -femit-bin="$output"
