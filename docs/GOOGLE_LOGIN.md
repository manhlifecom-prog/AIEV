# Google sign-in for Studio

Create a Google Auth Platform OAuth client of type **Web application**. Configure the consent screen for AIEV Studio, support contact, homepage and privacy policy. Only `openid email profile` scopes are requested. Publish the consent configuration for customers (or add specific test users while testing).

Authorized redirect URI (exact):

`https://video.manh.marketing/api/customer/auth/google/callback`

Set server-only `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `/etc/aiev-video.env`. Do not put the secret in web environment variables, Git, screenshots, or chat. Restart the customer API after configuration. The sign-in button is shown only when both settings exist. No Google Drive or photo permission is requested by login.

Deploy the compiled customer API including its google-auth-library dependency, and the web build together. Back up SQLite and the running release first. Tables google_accounts and google_flows are created additively; no existing balances or passwords are changed. A rollback can keep these extra tables.

New Google identities create customer accounts with zero balance. Existing email/password accounts require their current AIEV password once to link, including admins. Linked identity uses Google's stable subject; verified email alone never grants access to an existing account. Blocked users cannot log in. Google-only accounts currently sign in with Google; password setup/recovery is not part of this change.

Callback uses one-use 10-minute SQLite flows bound to an HttpOnly, SameSite=Lax cookie, state, nonce and PKCE. Google library verifies ID-token signature, issuer, audience and expiry. Access/refresh tokens are not persisted. Only fixed Studio/admin redirects are used.

Before opening to customers, test real Google sign-in, cancel, existing-password linking, blocked account, admin redirect, logout/relogin, and unchanged wallet balance on production. Embedded app webviews may be rejected by Google: this release adds browser web sign-in only, not native system-browser session handoff.
