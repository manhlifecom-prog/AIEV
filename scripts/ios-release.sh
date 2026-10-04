#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${AIEV_APPLE_TEAM_ID:?Set the Apple Developer Team ID; sign into the matching account in Xcode first.}"
if [[ ! "$AIEV_APPLE_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]]; then echo 'Invalid Apple Team ID' >&2; exit 1; fi
command -v xcodebuild >/dev/null
command -v xcodegen >/dev/null
mkdir -p .runtime/apple-release
xcodegen generate --spec apps/mobile/ios/project.yml
xcodebuild archive -project apps/mobile/ios/AIEVStudio.xcodeproj -scheme AIEVStudio \
  -destination 'generic/platform=iOS' -archivePath .runtime/apple-release/AIEVStudio.xcarchive \
  DEVELOPMENT_TEAM="$AIEV_APPLE_TEAM_ID" -allowProvisioningUpdates
python3 - <<'PY'
import os, plistlib
with open('.runtime/apple-release/ExportOptions.plist', 'wb') as output:
    plistlib.dump({'method': 'app-store-connect', 'destination': 'export', 'teamID': os.environ['AIEV_APPLE_TEAM_ID'], 'signingStyle': 'automatic', 'manageAppVersionAndBuildNumber': False}, output)
PY
xcodebuild -exportArchive -archivePath .runtime/apple-release/AIEVStudio.xcarchive \
  -exportOptionsPlist .runtime/apple-release/ExportOptions.plist \
  -exportPath .runtime/apple-release/ipa -allowProvisioningUpdates
shasum -a 256 .runtime/apple-release/ipa/*.ipa
echo 'Signed IPA exported. Upload with Xcode Organizer or Apple Transporter to the matching App Store Connect app.'
