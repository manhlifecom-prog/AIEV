# AIEV customer app release

Desktop 1.0.0 adds a media library scoped to each signed-in account. The OS picker grants access to specific videos or folders; the assistant receives opaque IDs, names and byte sizes, never local paths. The native process validates every selected ID and rechecks the file before copying it. Video originals and rendered MP4 files stay on the customer device. Existing speech recognition uploads short audio chunks to the authenticated AI service.

The server streams chat immediately, caches successful turn IDs, and permits conversation while a render is active. Rendering remains single-flight. The assistant selects up to 50 clips from up to 200 relevant metadata entries; a selected folder indexes up to 2,000 videos. Large collections should use a specific subfolder. Revoking a library stops future reads; it does not erase sources already copied into a customer's existing local projects.

## Windows

Build with `node scripts/desktop-build.mjs --win nsis --x64 --publish never`. Validate the packaged ASAR contains `media-library.cjs`, the preload version matches package version, the limited bridge exposes no shell or arbitrary filesystem API, and bundled FFmpeg renders a fixture. Publish the EXE and SHA-256 together with the corresponding web/API release. The current installer is unsigned; a version number does not supply a publisher certificate.

## Official Mac distribution

Use an Apple Developer ID Application certificate, not an ad-hoc signature. Set `CSC_LINK`, `CSC_KEY_PASSWORD`, and Apple notarization credentials through the release environment's secret store. Supported credentials are `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, or `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`.

On the matching Mac build host:

```sh
node scripts/prepare-mac-media.mjs
node scripts/desktop-build.mjs --production --mac dmg zip --arm64 --publish never
node scripts/verify-mac-app.mjs --production
```

Repeat for x64. The production command fails before packaging when signing or notarization credentials are absent and does not accept flags disabling these requirements. The verifier checks Developer ID, hardened runtime, Gatekeeper assessment and the stapled notarization ticket, in addition to an actual video render. Only verified signed outputs may be labeled official. Existing `apple-preview-0.6.0` downloads remain previews and must not be renamed to imply certification.

## Official iPhone / iPad distribution

The iOS source has its own native AVFoundation renderer and a Files picker. It does not use the desktop media-library bridge. iOS limits access to documents selected through its system picker; the app cannot read the entire computer or phone.

On a Mac with Xcode, XcodeGen and the matching Apple Developer account signed in:

```sh
AIEV_APPLE_TEAM_ID=YOUR_TEAM_ID AIEV_IOS_VERSION=1.0.0 AIEV_IOS_BUILD=100 bash scripts/ios-release.sh
```

This archives and exports an App Store distribution IPA, verifies its bundle version and embedded provisioning profile, and records SHA-256. Upload to the existing `marketing.manh.aiev` App Store Connect app with Xcode Organizer or Apple Transporter. Customer distribution requires Apple's App Store review. Do not advertise an unsigned archive as an installable IPA or invent an App Store/TestFlight link.

## Web/API activation

Build the customer web and API. Back up SQLite through its backup API while the services are stopped, preserve the running API modules, web build and download manifest, then activate verified files atomically. Verify Studio, admin, config, download checksums, chat streaming and native-render ownership with a separate test account. Roll back modules/web/manifest together if the health checks fail; do not restore an older database over newly credited SePay transactions.
