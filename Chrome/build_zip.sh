#!/bin/bash

cd "$(dirname "$0")"

mkdir -p dist/

cd src/

ZIPFILE="../dist/PwdHash-Chrome.zip"
[ -e "$ZIPFILE" ] && rm "$ZIPFILE"
zip -q -r -9 "$ZIPFILE" .
