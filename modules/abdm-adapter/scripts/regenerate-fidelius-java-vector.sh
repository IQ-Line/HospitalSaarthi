#!/usr/bin/env bash
# Regenerate fidelius-java-vector.json from ABDM-wrapper-equivalent Java (BC curve25519).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOL="$ROOT/tools/fidelius-java-vector"
OUT="$ROOT/src/test-fixtures/fidelius-java-vector.json"
cd "$TOOL"
if command -v mvn >/dev/null 2>&1; then
  mvn -q compile exec:java -Dexec.mainClass=FideliusVectorMain >"$OUT"
else
  docker run --rm -v "$TOOL":/w -w /w maven:3.9-eclipse-temurin-17 \
    mvn -q compile exec:java -Dexec.mainClass=FideliusVectorMain >"$OUT"
fi
echo "Wrote $OUT"
