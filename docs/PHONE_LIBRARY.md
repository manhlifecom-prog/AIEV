# Phone video library

Android 0.2.0 opens the system video picker (Photo Picker on Android 13+, document picker on Android 10–12). It accepts only content URIs with video MIME types; cancellation returns no selection. It does not request whole-library or all-files access. Selected files feed the existing browser renderer in the trusted app WebView. A per-download random capability streams an explicit MP4 blob download into MediaStore Downloads; arbitrary file paths and URLs are not accepted by the bridge.

iOS 0.7.0 uses PHPicker restricted to videos, copies provider URLs before the callback ends, and offers the Files picker separately. Sources are indexed within the current app session and account; AI can select only these source IDs. Revoke removes imported library copies, leaving originals and completed video jobs intact. Switching accounts clears the previous source library. iOS distribution still requires Apple signing.

Web/mobile Studio shows Connect video library, selected sources and Revoke. Video reading requires the user's selection; it does not scan a whole phone or search ungranted assets. Finding arbitrary trips by date/location across the entire library is not implemented. Voice/frame analysis follows the existing AI processing flow after sources are selected.

Rollout requires both web/API deployment and the new native build. Android 0.1.0 remains chat-only. Do not advertise the feature as live until both have been deployed. Physical Android/iPhone verification is still required; this Windows build host has no connected phone.

Validation: Android release build and lint passed; APK signature matches 0.1.0; six web/API source-isolation tests and production build passed; UI selection/revocation verified with a synthetic clip. iOS simulator tests and unsigned device archive passed on GitHub Actions run 37569115512 for commit d594460. Whole-library search and physical-device verification remain outside the completed functionality.
