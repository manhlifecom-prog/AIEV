# Windows automatic updates

AIEV Studio 1.2.0 adds electron-updater. Earlier versions need one manual installation of 1.2.0; subsequent updates download in the background and install on normal quit. The update dialog also supports an explicit restart. Active video, library and AI operations block installation/quit.

Release procedure:
1. Increment desktop package/lock and preload versions; build Windows NSIS with scripts/desktop-build.mjs.
2. Publish the verified installer to the matching studio-VERSION GitHub release.
3. Update apps.json and public/studio/updates/latest.yml with the exact uploaded URL, size and SHA512 from the build. Publish the feed only after the asset is publicly available.
4. Back up SQLite and the current web build; deploy the web build and metadata atomically with rollback.

The generic HTTPS feed is https://video.manh.marketing/studio/updates/. Only stable forward updates are enabled. Full downloads support previous releases without blockmaps. Installer integrity uses electron-updater's SHA512 validation. No signing certificate is configured yet; the Windows installer remains unsigned.

Validation for 1.2.0: 11 native tests; TypeScript and production web build; real Electron updater download and corruption rejection in an isolated fixture; update dialog and busy-state rejection. An installed Windows version-to-version NSIS upgrade has not been exercised in this environment.
