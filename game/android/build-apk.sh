#!/usr/bin/env bash
#
# Builds a signed, installable PACT.apk without Android Studio, without Gradle
# and without the Android SDK installer.
#
# The pieces are sourced individually because dl.google.com is not always
# reachable from a build box:
#   aapt2      npm package `aaptjs3`, which ships the official linux binary
#   android.jar  a mirrored API 33 platform jar (needed by aapt2 and javac)
#   dx         Maven Central, com.jakewharton.android.repackaged:dalvik-dx
#   apksig     Maven Central, com.android.tools.build:apksig
#   keytool/javac  the JDK already on the machine
#
# Everything downloaded lands in .tools/ and is reused on later runs.
#
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$PWD"
TOOLS="$ROOT/.tools"
OUT="$ROOT/build"
API=33
MIN_SDK=24

mkdir -p "$TOOLS" "$OUT"

log() { printf '\033[2m›\033[0m %s\n' "$*"; }

# ── 1. Toolchain ────────────────────────────────────────────────────

AAPT2="$TOOLS/aapt2"
if [ ! -x "$AAPT2" ]; then
  log "fetching aapt2"
  (cd "$TOOLS" && npm init -y >/dev/null 2>&1 || true; npm i --no-save aaptjs3 >/dev/null 2>&1)
  cp "$TOOLS/node_modules/aaptjs3/bin/x64/linux/aapt2" "$AAPT2"
  chmod +x "$AAPT2"
fi

if [ ! -f "$TOOLS/android.jar" ]; then
  log "fetching android.jar (API $API)"
  curl -sSL -o "$TOOLS/android.jar" \
    "https://raw.githubusercontent.com/Sable/android-platforms/master/android-$API/android.jar"
fi

if [ ! -f "$TOOLS/dx.jar" ]; then
  log "fetching dx"
  V=$(curl -sS https://repo1.maven.org/maven2/com/jakewharton/android/repackaged/dalvik-dx/maven-metadata.xml \
      | grep -o '<release>[^<]*' | sed 's/<release>//')
  curl -sSL -o "$TOOLS/dx.jar" \
    "https://repo1.maven.org/maven2/com/jakewharton/android/repackaged/dalvik-dx/$V/dalvik-dx-$V.jar"
fi

if [ ! -f "$TOOLS/apksig.jar" ]; then
  log "fetching apksig"
  V=$(curl -sS https://repo1.maven.org/maven2/com/android/tools/build/apksig/maven-metadata.xml \
      | grep -o '<release>[^<]*' | sed 's/<release>//')
  curl -sSL -o "$TOOLS/apksig.jar" \
    "https://repo1.maven.org/maven2/com/android/tools/build/apksig/$V/apksig-$V.jar"
fi

# ── 2. Web build into assets/ ───────────────────────────────────────

log "building the game"
(cd "$ROOT/.." && npm run build >/dev/null)
mkdir -p "$ROOT/assets"
cp "$ROOT/../dist/index.html" "$ROOT/assets/index.html"
log "asset payload: $(du -h "$ROOT/assets/index.html" | cut -f1)"

# ── 3. Resources ────────────────────────────────────────────────────

log "compiling resources"
rm -rf "$OUT/res.zip" "$OUT/linked.apk"
"$AAPT2" compile --dir "$ROOT/res" -o "$OUT/res.zip"

log "linking"
"$AAPT2" link \
  -o "$OUT/linked.apk" \
  -I "$TOOLS/android.jar" \
  --manifest "$ROOT/AndroidManifest.xml" \
  -A "$ROOT/assets" \
  --min-sdk-version "$MIN_SDK" \
  --target-sdk-version "$API" \
  --no-version-vectors \
  "$OUT/res.zip"

# ── 4. Java → dex ───────────────────────────────────────────────────

log "compiling java"
rm -rf "$OUT/classes" && mkdir -p "$OUT/classes"
# dx predates Java 9 bytecode, so target 8 and keep the source lambda-free.
javac -nowarn -source 8 -target 8 -bootclasspath "$TOOLS/android.jar" \
  -classpath "$TOOLS/android.jar" \
  -d "$OUT/classes" \
  $(find "$ROOT/src" -name '*.java') 2>&1 | grep -v 'bootstrap class path\|source value 8\|target value 8\|deprecat' || true

log "dexing"
java -cp "$TOOLS/dx.jar" com.android.dx.command.Main \
  --dex --min-sdk-version="$MIN_SDK" --output="$OUT/classes.dex" "$OUT/classes"

# ── 5. Assemble + sign ──────────────────────────────────────────────

log "assembling"
cp "$OUT/linked.apk" "$OUT/unsigned.apk"
(cd "$OUT" && zip -q -X "unsigned.apk" classes.dex)

# `zip` does not preserve aapt2's alignment, and Android 11+ rejects an APK
# whose resources.arsc is not 4-byte aligned. Realign before signing, which
# covers the final byte layout.
log "aligning"
python3 "$ROOT/tools/zipalign.py" "$OUT/unsigned.apk" "$OUT/aligned.apk"

if [ ! -f "$TOOLS/pact.p12" ]; then
  log "generating signing key"
  keytool -genkeypair -v \
    -keystore "$TOOLS/pact.p12" -storetype PKCS12 \
    -storepass pactpact -keypass pactpact \
    -alias pact -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=PACT, OU=Dark Hour, O=Independent, L=-, ST=-, C=ZZ" >/dev/null 2>&1
fi

# APK Signature Scheme v2 only.
#
# v1 is not used: apksig 2.3.0's v1 signer calls a sun.security.pkcs method
# modern JDKs no longer expose, and signing v1 separately with jarsigner does
# not survive — apksig strips foreign META-INF signatures when its own v1
# signer is disabled. v2 alone covers Android 7.0 and up, which is what
# minSdk 24 declares, and Android 11+ demands v2 regardless.
log "signing (v2)"
javac -nowarn -cp "$TOOLS/apksig.jar" -d "$OUT" "$ROOT/tools/ApkSign.java" "$ROOT/tools/ApkVerify.java"
java \
  --add-exports java.base/sun.security.x509=ALL-UNNAMED \
  --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
  --add-exports java.base/sun.security.util=ALL-UNNAMED \
  -cp "$TOOLS/apksig.jar:$OUT" ApkSign \
  "$OUT/aligned.apk" "$OUT/PACT.apk" \
  "$TOOLS/pact.p12" pactpact pact pactpact "$MIN_SDK"

# ── 6. Verify what we are about to hand over ────────────────────────

log "verifying signatures"
java -cp "$TOOLS/apksig.jar:$OUT" ApkVerify "$OUT/PACT.apk" "$MIN_SDK" 34

log "verifying alignment + manifest"
python3 "$ROOT/tools/zipalign.py" --check "$OUT/PACT.apk" 2>/dev/null || \
  python3 -c "
import sys; sys.path.insert(0, '$ROOT/tools')
from zipalign import report
sys.exit(1 if report('$OUT/PACT.apk') else 0)
"
"$AAPT2" dump badging "$OUT/PACT.apk" | head -4

echo
echo "  → $OUT/PACT.apk  ($(du -h "$OUT/PACT.apk" | cut -f1))"
