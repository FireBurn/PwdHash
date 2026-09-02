# PwdHash 4.0.0

**Some generated passwords change in this release.** That is the point of it: none of the four
implementations in this project agreed with each other about which domain to hash with, and none of
them agreed with the original PwdHash. If a site's password stops working, see
[which domain PwdHash hashes with](docs/DOMAIN-RULES.md) and the list below.

The version is a major bump for that reason alone. Nothing about your master password changes.

## Compatibility with the original PwdHash

Legacy (HMAC-MD5) mode exists to reproduce passwords made with the original
[Stanford website](https://pwdhash.github.io/website/) and the
[old Firefox extension](https://github.com/pwdhash/pwdhash-webextension). It did not.

- **Domain extraction is now the original's, ported line for line** from Collin Jackson's 2005
  `domain-extractor.js`, list of 270 two-part suffixes and all. Every platform used a rule invented
  for this project instead; against the real original, 13 of 19 sample hosts came out wrong
  somewhere.
- **The extension no longer pads its base64 hash.** The original uses `b64pad = ""`. Ours used
  `"="`, which changed every legacy password with a master password of 22 characters or more.
- **Legacy mode no longer fails for master passwords of 65 characters or more.** It threw, told you
  it "could not generate the password", and left your master password sitting in the field.
- **Android hashes 8-bit characters, as the original does.** It was UTF-8 encoding instead, so any
  master password with an accent, a non-Latin script or an emoji produced a password no other
  PwdHash could reproduce.

The original implementation is now vendored under `tests/original/` and the test suite generates
its expectations by running it, so legacy mode cannot drift again.

## Modern mode uses the Public Suffix List

Modern (PBKDF2) mode is new to this project, so it has no old passwords to honour and can simply be
correct. It now parses the address properly - lowercasing, punycoding, ignoring the port and path -
and applies a **pinned snapshot** of the [Public Suffix List](https://publicsuffix.org/), wildcards
and exceptions included.

That fixes two real problems. Every `*.ac.uk` and `*.me.uk` site shared one salt on Android, so one
leaked university password was every university password. And separately hosted sites are now
separated: `myapp.herokuapp.com` and `otherapp.herokuapp.com` get different passwords.

The snapshot is pinned, not fetched, so the extension and the app cannot drift apart between
releases and an upstream edit cannot silently change your password. Updating it is a deliberate,
released change.

## Which sites change

Of 41 widely used sites checked, 8 change for extension users and 7 for Android users. Google,
Amazon, GitHub, Facebook, PayPal, Netflix, Dropbox, LinkedIn, the UK high-street banks and every
plain `something.com` are **unaffected**.

Sites that change are the ones with a short domain under a short suffix, or a suffix the old rule
did not know:

| site | before | now |
|:--|:--|:--|
| `www.bbc.com`, `edition.cnn.com`, `www.hp.com`, `mail.qq.com` | kept the subdomain | `bbc.com`, `cnn.com`, `hp.com`, `qq.com` |
| `secure.ing.nl`, `www.ing.nl` | `secure.ing.nl` / `www.ing.nl` | `ing.nl` |
| `login.cam.ac.uk`, `www.imperial.ac.uk` (Android, website) | `ac.uk` | `cam.ac.uk`, `imperial.ac.uk` |
| `www.example.me.uk`, `login.example.ne.jp` (Android, website) | `me.uk`, `ne.jp` | `example.me.uk`, `example.ne.jp` |
| `myapp.herokuapp.com`, `user.github.io` (modern mode) | `herokuapp.com`, `github.io` | the full host |

If one of these is you: the extension popup, the website and the app all show the domain they are
about to hash with, and the website and the app show the legacy domain too when it differs. Sign in
with your old password, then change it to the new one.

One thing to know about legacy mode: the original's list has no entry for `gov.uk`, so every
`*.gov.uk` site hashes with `gov.uk` and shares a password. That is faithful to the original, and
it is a good reason to use modern mode for anything new.

## Fixes

### Chrome extension

- **A password field can be edited again after a failed login.** On a site that leaves the box
  populated when sign-in fails, the field could not be changed at all until the page was reloaded -
  reported from the Chrome Web Store. Typing in a filled field now hands it back to the page, and
  typing `@@` arms it again.
- **Framework-driven login forms get the generated password.** React, Vue and Angular keep their
  own copy of a field's value and submit that; the extension was writing to the DOM without telling
  them, so such a form could send the master password to the site.
- **Single-page logins submit properly.** The extension finished by calling the form's native
  `submit()`, which skips the page's own submit handler and reloads instead of signing in.
- The popup shows the domain the content script will actually use, for the mode you have selected.
  It had its own third copy of the domain rule and disagreed with the extension in 9 of 15 cases.
- **You can override the domain for a site.** No rule can know which credential a login form leads
  to, so if two sites should share a password - or one account is reachable from two unrelated
  hosts - open the popup and choose **Use a different domain**. Overrides sync with your other
  Chrome profiles. The website and the app need no equivalent: you type the site yourself.
- Generation now stops with an error if the extension cannot read its settings, rather than
  falling back to defaults and quietly producing a password for the wrong mode or without your
  override.

### Android

- Key derivation no longer runs on the main thread. 300,000 rounds of PBKDF2 froze the UI, and on
  slower devices that is ANR territory.

## For contributors

- `node --test tests/` and `cd Android && ./gradlew testDebugUnitTest` check all three platforms
  against shared vectors in `tests/vectors.txt` and `tests/domain-vectors.txt`, generated from the
  vendored original. CI runs both.
- `docs/DOMAIN-RULES.md` explains the two domain rules and how to update the pinned snapshot.
