# Which domain PwdHash hashes with

Every PwdHash password is derived from two things: your master password, and the site's domain. Get
the domain wrong by one label and you get a completely different password, so the rule that turns
`https://login.example.co.uk/account` into `example.co.uk` is as much a part of the format as the
hash function is.

The two modes use **different rules on purpose**.

## Legacy mode: frozen

Legacy mode exists to reproduce passwords made with the original PwdHash — the
[Stanford website](https://pwdhash.github.io/website/), the
[old Firefox extension](https://github.com/pwdhash/pwdhash-webextension), and anything ported from
them. Its rule is Collin Jackson's 2005 `domain-extractor.js`, ported line for line:

1. Strip a leading `http://` or `https://` and take everything up to the first `/`.
2. Split on `.`. Fewer than three labels? That is the answer.
3. Otherwise take the last two labels, and if that pair is one of the 270 entries in the original's
   hardcoded list (`co.uk`, `ac.uk`, `me.uk`, `ne.jp`, `uk.com`, `com.au`, …), take three instead.

**This rule must never be improved.** Its gaps are part of the contract. It does not lowercase, so
`https://WWW.Example.CO.UK/` hashes with `CO.UK`; it keeps a port, so `example.com:8443` hashes with
`example.com:8443`; `gov.uk` is missing from its list, so `www.gov.uk` hashes with `gov.uk`; and
`192.168.0.1` hashes with `0.1`. All of that is what the original did, so all of that is what we do.

The vendored copy of the original under [`tests/original/`](../tests/original) is the oracle: the
test suite runs it and compares, so the rule cannot drift.

## Modern mode: the Public Suffix List, pinned

Modern (PBKDF2) mode is new to this project, so it has no old passwords to be compatible with and
can simply be correct. It parses the input as a URL — lowercasing it, punycoding an
internationalised name, dropping the port and the path — and then applies the
[Public Suffix List](https://publicsuffix.org/) algorithm, including its wildcard (`*.ck`) and
exception (`!www.ck`) rules. IP addresses are used as-is.

That means modern mode knows the ~8,800 two-part suffixes the 2005 list never had, and isolates
sites the older rule lumps together: `myapp.herokuapp.com` and `otherapp.herokuapp.com` get
different passwords, where legacy mode gives both `herokuapp.com`.

**The list is pinned, not live.** `*/data/public-suffix-list.txt` is a snapshot committed to the
repository, identical byte for byte on all three platforms. This is deliberate:

- If each platform tracked the live list, the extension and the app would drift apart between
  releases and stop agreeing on your password.
- A rule added upstream would silently change an existing password on the next update.

Updating the snapshot is therefore a **breaking change**. Run
[`tools/update-public-suffix-list.mjs`](../tools/update-public-suffix-list.mjs), check what moved,
and say so in the release notes.

## Where it lives

| | |
|:--|:--|
| `Chrome/src/js/domain-extractor.js` | the implementation, used by the content script and the popup |
| `docs/js/domain-extractor.js` | byte-identical copy for the website; a test enforces that |
| `Android/app/src/main/java/uk/co/fireburn/pwdhash/DomainExtractor.kt` | the Kotlin port |
| `*/data/public-suffix-list.txt`, `Android/app/src/main/assets/` | the pinned snapshot, three identical copies |
| `tests/domain-vectors.txt` | what all three are checked against, generated from the original |

Run `node --test tests/` and `cd Android && ./gradlew testDebugUnitTest` to check all of it.
