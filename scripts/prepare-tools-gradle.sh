#!/usr/bin/env bash
# Fetch the wrapper-pinned distribution without depending on its redirect host.
set -euo pipefail

DISTRIBUTION_DIRECTORY=${1:?Usage: prepare-tools-gradle.sh DIRECTORY [WRAPPER_PROPERTIES]}
WRAPPER_PROPERTIES=${2:-android/gradle/wrapper/gradle-wrapper.properties}
PROPERTIES=$(tr -d '\r' < "$WRAPPER_PROPERTIES")
VERSION=$(printf '%s\n' "$PROPERTIES" | sed -n 's|^distributionUrl=.*gradle-\([0-9][0-9A-Za-z.-]*\)-bin\.zip$|\1|p')
CHECKSUM=$(printf '%s\n' "$PROPERTIES" | sed -n 's/^distributionSha256Sum=//p')
[[ "$VERSION" =~ ^[0-9]+(\.[0-9]+){1,2}(-[A-Za-z0-9.-]+)?$ ]] || { echo 'Invalid pinned Gradle version' >&2; exit 1; }
[[ "$CHECKSUM" =~ ^[0-9a-fA-F]{64}$ ]] || { echo 'Missing pinned Gradle checksum' >&2; exit 1; }

mkdir -p "$DISTRIBUTION_DIRECTORY"
ARCHIVE="$DISTRIBUTION_DIRECTORY/gradle-$VERSION-bin.zip"
archive_is_valid() {
  printf '%s  %s\n' "$CHECKSUM" "$ARCHIVE" | sha256sum --check --status
}
if [ ! -s "$ARCHIVE" ] || ! archive_is_valid; then
  DOWNLOADED=false
  # The API asset endpoint avoids the browser-download redirects that can
  # return 504 even when the official GitHub release asset is available.
  if command -v gh >/dev/null 2>&1; then
    if timeout 90 gh release download "v$VERSION" --repo gradle/gradle-distributions --pattern "gradle-$VERSION-bin.zip" --output "$ARCHIVE" --clobber; then
      DOWNLOADED=true
    fi
  fi
  # Bound the remaining alternate-host attempts to one minute each. Retry
  # only distribution downloads, never the native compilation.
  for URL in \
    "https://github.com/gradle/gradle-distributions/releases/download/v$VERSION/gradle-$VERSION-bin.zip" \
    "https://downloads.gradle.org/distributions/gradle-$VERSION-bin.zip" \
    "https://github.com/gradle/gradle-distributions/releases/download/v$VERSION/gradle-$VERSION-bin.zip"; do
    if [ "$DOWNLOADED" = true ]; then
      break
    fi
    if curl --fail --location --silent --show-error --connect-timeout 15 --max-time 60 --output "$ARCHIVE" "$URL"; then
      DOWNLOADED=true
      break
    fi
  done
  if [ "$DOWNLOADED" != true ]; then
    echo 'Gradle distribution could not be downloaded from official sources' >&2
    exit 1
  fi
fi

printf '%s  %s\n' "$CHECKSUM" "$ARCHIVE" | sha256sum --check
unzip -q -o "$ARCHIVE" -d "$DISTRIBUTION_DIRECTORY"
GRADLE_BIN="$DISTRIBUTION_DIRECTORY/gradle-$VERSION/bin/gradle"
test -f "$GRADLE_BIN"
if [ -n "${GITHUB_ENV:-}" ]; then
  printf 'TOOLS_GRADLE_BIN=%s\n' "$GRADLE_BIN" >> "$GITHUB_ENV"
fi
printf 'Verified Gradle %s: %s\n' "$VERSION" "$GRADLE_BIN"
