#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

mkdir -p dist

version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' src/manifest.json)
if [[ -z "$version" ]]; then
    echo "Could not read the extension version from src/manifest.json" >&2
    exit 1
fi

zipfile="dist/PwdHash-Chrome-${version}.zip"
rm -f "$zipfile"
(cd src && zip -q -r -9 "../$zipfile" .)
echo "Created $zipfile"
