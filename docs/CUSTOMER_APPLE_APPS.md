# AIEV Apple apps — 0.6.0

## Runtime

MacBook/iMac use the Electron controller shared with Windows. The preload identifies `macos` and exposes only chat, cancellation, progress, owned output opening and saving. FFmpeg/ffprobe are static Mac executables, selected without the Windows `.exe` suffix. Intel and Apple Silicon get separate packages. Sources, merged footage and MP4 outputs stay in application userData. Both shared file and public recursive folder links follow the existing Drive pipeline.

iPhone/iPad use SwiftUI, a persistent WKWebView account session and a limited native bridge. AVFoundation performs source probing, rotation-aware contain scaling/padding, merging, source range selection/reordering, captions/title overlays and MP4 export. Multiple local files can be selected through the Files picker. Drive sources download directly to the device using a separate cookie-free URLSession. Native API requests obtain only the Studio session cookie from WKHTTPCookieStore and never forward it to Drive. Bridge calls require the authenticated site's HTTPS origin and the main frame; arbitrary file paths, API endpoints and executable commands are not exposed.

The existing streamed assistant protocol is reused. Device identity describes capabilities; it never grants an admin role or free tokens. `macos`/`ios` require protocol version 0.6.0 or newer before the assistant treats them as local renderers. Existing Windows 0.3/0.4/0.5 clients remain compatible. Pricing, reservation, idempotent confirmation, cached transcription/plans, real-debit refunds and admin exemptions remain server-side.

iOS extracts mono AAC M4A at 48 kbps in chunks up to 600 seconds, under the existing 5 MB audio cap. `X-AIEV-Audio-Format: m4a` selects the transcription file name; Windows continues sending MP3. Only speech chunks go to the service/AI, not the original footage or exported MP4. Failed output acknowledgements can resume from the existing checked final file; cached plans allow a free render retry. Local records bind outputs and source reuse to the current account ID; server video ownership is checked again before opening or sharing.

## Limits

iOS 17 or newer, iPhone and iPad. macOS 13 or newer (Electron 44). Apple Silicon and Intel Mac packages are built and tested separately on macOS 15. AVFoundation supports the video's actual device codecs; MP4/MOV/M4V are the intended iOS inputs. MKV/WebM/AVI and unusual codecs should use the Mac/Windows engine. Original audio is preserved; translated captions, generated scenes/music and arbitrary effects are not supported. Keep the iPhone app in the foreground while rendering. iOS may suspend or terminate processing in the background; source, job records and cached plans persist for retries. Video output is local to the device and is not automatically synchronized to another device.

The web download guide distinguishes native installers from browser shortcuts. No iOS download/TestFlight link is shown until a signed distribution exists. Mac preview packages are ad-hoc signed, not Developer ID signed/notarized; they are explicitly labelled previews. Production distribution still needs Apple signing.

## Build and distribution

`.github/workflows/apple-apps.yml` runs on standard GitHub-hosted macOS runners: Mac arm64 and x64 packaging, real rendering from the packaged media engine, native iOS compilation, iPhone simulator tests and an unsigned device archive. CI uses no OpenAI/payment/signing secrets. Mac packages contain pinned FFmpeg 6.1.1 binaries with their build metadata, license and source links. The Mac test rejects unbundled dynamic-library dependencies and verifies the app's ad-hoc signature.

For an official Mac release, use a Mac with Developer ID signing/notarization configured, run `node scripts/prepare-mac-media.mjs` on the target architecture, then build with `node scripts/desktop-build.mjs --mac dmg zip --arm64 --publish never` (or `--x64`). Configure signing using the supported electron-builder 26 certificate environment variables and Apple notarization credentials; do not add secrets to Git. Verify the signed/notarized bundle before replacing preview download links.

For iOS distribution, sign into the authorized Apple Developer account in Xcode and register the App Store Connect app with bundle ID `marketing.manh.aiev`. Install XcodeGen, set `AIEV_APPLE_TEAM_ID`, then run `bash scripts/ios-release.sh`. The script archives and exports an App Store Connect signed IPA; it does not upload or publish the app. Upload with Xcode Organizer/Transporter, process the build and create the TestFlight group/link. An unsigned `.xcarchive` from CI cannot be installed on customers' iPhones. Apple Developer Program membership and appropriate App Store Connect access are required for TestFlight/App Store distribution.

## Verification

Local verification: 28 customer API/media tests and 7 native bridge/security tests pass; TypeScript server and web checks pass. A separate Windows controller integration with real OpenAI and FFmpeg verified a two-clip Drive fixture with mixed dimensions/audio, a 4-second square output and 3-second source-reusing revision; admin stayed at zero. This integration simulated Electron IPC rather than operating an installed native window.

Apple CI and release artifact results are recorded below after the current build completes. A device archive or simulator success is not a claim that a physical iPhone/iPad or customer Mac installation has been tested.

References: [Apple distribution](https://developer.apple.com/documentation/Xcode/distributing-your-app-for-beta-testing-and-releases), [Apple build upload](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/), [electron-builder macOS](https://www.electron.build/docs/mac/), [FFmpeg static builds](https://github.com/eugeneware/ffmpeg-static).

CI uses deployment target 18.4 only for the iOS 18.5 simulator test to avoid [WebKit simulator bug 293831](https://bugs.webkit.org/show_bug.cgi?id=293831); the device archive remains iOS 17. Mac minimum OS follows [Electron 44](https://www.electronjs.org/blog/electron-44-0).
