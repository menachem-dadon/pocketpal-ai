#!/usr/bin/env bash
# A short cold-launch check; no model downloads, account setup or UI journey.
set -euo pipefail

APK=${1:?Usage: verify-android-startup.sh APK [LOG_DIRECTORY]}
LOG_DIRECTORY=${2:-startup-logs}
PACKAGE=com.menachem.pocketpal.tools
mkdir -p "$LOG_DIRECTORY"

collect_logs() {
  adb logcat -d -v threadtime > "$LOG_DIRECTORY/logcat.txt" || true
  adb logcat -b crash -d > "$LOG_DIRECTORY/crashes.txt" || true
  adb shell dumpsys activity activities > "$LOG_DIRECTORY/activities.txt" || true
  adb exec-out screencap -p > "$LOG_DIRECTORY/startup.png" || true
  adb shell am force-stop "$PACKAGE" >/dev/null 2>&1 || true
}
trap collect_logs EXIT

adb install -r "$APK"
adb shell am force-stop "$PACKAGE"
adb logcat -b all -c
adb shell am start -W -n "$PACKAGE/com.pocketpal.MainActivity"
for _ in {1..15}; do
  sleep 1
  if ! adb shell pidof "$PACKAGE" >/dev/null; then
    echo 'Application exited during cold startup' >&2
    exit 1
  fi
done
adb logcat -b crash -d > "$LOG_DIRECTORY/crashes.txt"
if grep -F -e "Process: $PACKAGE," -e ">>> $PACKAGE <<<" -e "Cmdline: $PACKAGE" "$LOG_DIRECTORY/crashes.txt"; then
  echo 'Application crash found after startup' >&2
  exit 1
fi
echo 'Cold startup passed: the application stayed alive without a crash'
