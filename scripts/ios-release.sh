#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${AIEV_APPLE_TEAM_ID:?Set the Apple Developer Team ID; sign into the matching account in Xcode first.}"
if [[ ! "$AIEV_APPLE_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]]; then echo 'Invalid Apple Team ID' >&2; exit 1; fi
command -v xcodebuild >/dev/null
command -v xcodegen >/dev/null
: "${AIEV_IOS_VERSION:=1.0.0}"
: "${AIEV_IOS_BUILD:=100}"
export AIEV_IOS_VERSION AIEV_IOS_BUILD
if [[ ! "$AIEV_IOS_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ || ! "$AIEV_IOS_BUILD" =~ ^[1-9][0-9]*$ ]]; then echo 'Invalid release version or build number' >&2; exit 1; fi
mkdir -p .runtime/apple-release
xcodegen generate --spec apps/mobile/ios/project.yml
xcodebuild archive -project apps/mobile/ios/AIEVStudio.xcodeproj -scheme AIEVStudio \
  -destination 'generic/platform=iOS' -archivePath .runtime/apple-release/AIEVStudio.xcarchive \
  DEVELOPMENT_TEAM="$AIEV_APPLE_TEAM_ID" MARKETING_VERSION="$AIEV_IOS_VERSION" CURRENT_PROJECT_VERSION="$AIEV_IOS_BUILD" -allowProvisioningUpdates
python3 - <<'PY'
import os, plistlib
with open('.runtime/apple-release/ExportOptions.plist', 'wb') as output:
    plistlib.dump({'method': 'app-store-connect', 'destination': 'export', 'teamID': os.environ['AIEV_APPLE_TEAM_ID'], 'signingStyle': 'automatic', 'manageAppVersionAndBuildNumber': False}, output)
PY
xcodebuild -exportArchive -archivePath .runtime/apple-release/AIEVStudio.xcarchive \
  -exportOptionsPlist .runtime/apple-release/ExportOptions.plist \
  -exportPath .runtime/apple-release/ipa -allowProvisioningUpdates
python3 - <<'PY'
import os, plistlib, subprocess, zipfile
from pathlib import Path
app=Path('.runtime/apple-release/AIEVStudio.xcarchive/Products/Applications/AIEVStudio.app')
info=plistlib.loads((app/'Info.plist').read_bytes())
assert info['CFBundleIdentifier']=='marketing.manh.aiev'
assert info['CFBundleShortVersionString']==os.environ['AIEV_IOS_VERSION']
assert info['CFBundleVersion']==os.environ['AIEV_IOS_BUILD']
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
assert (app/'embedded.mobileprovision').is_file()
ipas=list(Path('.runtime/apple-release/ipa').glob('*.ipa'))
assert len(ipas)==1
with zipfile.ZipFile(ipas[0]) as ipa:
    assert any(n.endswith('/embedded.mobileprovision') for n in ipa.namelist())
print('Distribution archive and exported IPA verified.')
PY
shasum -a 256 .runtime/apple-release/ipa/*.ipa
echo 'Signed IPA exported. Upload with Xcode Organizer or Apple Transporter to the matching App Store Connect app.'
