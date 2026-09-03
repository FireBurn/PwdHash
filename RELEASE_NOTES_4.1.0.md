# PwdHash 4.1.0

A security release. No generated password changes, so nothing you already use needs rotating.

## The site can no longer read your master password

A web page can read every character typed into its own password field. Until now that included
yours: a site never needed to break the hash, it could simply record the master password as you
entered it. The original PwdHash defended against this and we had dropped the defence.

It is back. Each character you type is replaced in the field by a placeholder, unique and never
reused, and the real password is reassembled only at the moment of hashing. Printable key events
and paste events are kept from the page as well, since those carry the character too. The page
learns how long your master password is, which cannot be hidden, and nothing else.

Editing still works normally - backspace, paste into the middle, retype - because each placeholder
stands for one character rather than one position. Text composed through an IME cannot be
intercepted keystroke by keystroke and goes in unmasked; that limitation is noted in the code.

## Android: the biometric prompt now means something

The prompt was a screen the app drew and then chose to honour. The Keystore key protecting your
saved master password did not require authentication, so the check was ours to skip rather than
Keystore's to enforce.

The key is now bound to authentication: one unlock makes it usable for thirty seconds, and
Keystore refuses to unwrap it otherwise. Consequences worth knowing:

- **A secure lock screen is required.** Without one there is nothing to bind to and Keystore will
  not create the key at all.
- **Weak biometrics are no longer offered**, because a time-bound key does not accept them. You
  will be asked for a strong biometric or your PIN, pattern or password.
- **Saving the master password now asks for authentication too**, which also closes a smaller gap:
  until now anyone holding your unlocked phone could quietly overwrite it.
- **A master password saved by 4.0 or earlier is migrated automatically** the first time it is
  used. You do not need to set it again.

Also on Android: both screens set `FLAG_SECURE`, so generated passwords stay out of screenshots,
screen recordings and the recent apps carousel; a generated password clears from the screen after
a minute, as the website's already did; and it clears from the clipboard after the same minute,
unless you have copied something else since.

## Other fixes

- **Password fields inside web components work.** Events from an open shadow root are retargeted
  to the host element, so the extension could not see those fields at all. It reads the composed
  path now.
- **The extension starts earlier.** It ran at `document_idle`, so typing `@@` into a field on a
  slow page before that point was simply missed. It runs at `document_start`.
- **The website no longer offers to save your master password.** Its field was marked
  `autocomplete="current-password"`, inviting the browser to store the one password that should
  never be stored anywhere.

## For contributors

- PBKDF2 and the HMAC-MD5 stack lived in two hand-maintained JavaScript copies; they are now one
  shared `js/pwdhash-algorithms.js`, held byte-identical by a test. `docs/js/main.js` lost 240
  lines. The Android port remains, checked against the same vectors.
- The extension manifest uses the `__MSG_` locale keys it already shipped, with a test that they
  resolve.
- `PWDHASH_RELEASE_STORE_TYPE` lets a JKS or JCEKS keystore be used for release signing without
  converting it.
