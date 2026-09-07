#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$ROOT/.tmp-megasena-bench"
rm -rf "$TMP"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

TSC="$(command -v tsc || true)"
if [[ -z "$TSC" ]]; then
  if command -v npx >/dev/null 2>&1; then
    TSC="npx tsc"
  else
    echo "TypeScript compiler not found (tsc/npx)." >&2
    exit 1
  fi
fi

cat > "$TMP/tsconfig.json" <<JSON
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "rootDir": "$ROOT",
    "outDir": "$TMP/out"
  },
  "include": [
    "$ROOT/src/modules/megasena/**/*.ts",
    "$ROOT/scripts/megasena/benchmark.ts"
  ]
}
JSON

# shellcheck disable=SC2086
$TSC -p "$TMP/tsconfig.json"
cd "$ROOT"
node "$TMP/out/scripts/megasena/benchmark.js"
