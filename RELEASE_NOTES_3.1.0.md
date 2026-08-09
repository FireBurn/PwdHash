# PwdHash 3.1.0

## Android

- Compiles against Android API 37.1, targets API 37, and uses current stable Android build tooling
  and libraries.
- Supports fingerprint, face, or the device PIN, pattern, or password. Devices without a biometric
  scanner now fall back to device credentials when a secure screen lock is configured.
- Replaces deprecated encrypted-preferences APIs with AES-GCM encryption backed directly by the
  Android Keystore.
- Consolidates the Modern and Legacy Android share targets onto one shared implementation.
- Marks copied passwords as sensitive, excludes encrypted app state from backups, and improves
  error handling and release-signing checks.

This release intentionally does not migrate a master password saved by an older Android version.
After upgrading, set the master password again. Clear the app's storage or reinstall it if you want
to remove all data left by the previous version first.

## Chrome extension and website

- Prevents password field contents from being written to the browser console.
- Prevents overlapping browser events from hashing a password more than once.
- Stops a form submission when password generation fails.
- Clears stale website results when inputs change, clears the website's master-password field after
  generation, automatically clears generated results after 60 seconds, and improves clipboard and
  keyboard handling.
- Adds a restrictive website Content Security Policy, accessibility and mobile-layout improvements,
  and Android beta enrollment instructions.

No password-generation or domain-extraction rules changed in this release.
