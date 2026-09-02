# The original PwdHash implementation

These files are copied verbatim from the upstream Stanford PwdHash project and are **not** to be
edited. They are the oracle the test suite generates its expectations from, so that every platform
in this repository can be checked against the real thing rather than against hand-copied vectors.

| file                  | source                                                              |
|:----------------------|:--------------------------------------------------------------------|
| `md5.js`              | <https://pwdhash.github.io/website/md5.js>                           |
| `domain-extractor.js` | <https://pwdhash.github.io/website/domain-extractor.js>              |
| `hashed-password.js`  | <https://pwdhash.github.io/website/hashed-password.js>               |

The old Firefox extension (<https://github.com/pwdhash/pwdhash-webextension>) ships byte-identical
copies of `md5.js` and `domain-extractor.js`, and a `hashed-password.js` that differs only in where
`SPH_kPasswordPrefix` is declared, so the website and the extension are one and the same algorithm.

Licensed under the BSD licence reproduced at the top of each file and in the repository `LICENCE`.
