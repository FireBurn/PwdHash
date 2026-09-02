# Cutting a release

```bash
./tools/release.sh 4.0.1
```

That is the whole thing. It bumps the version in both places, scaffolds the release notes from your
commits if you have not written them, runs every test, commits, tags, and asks once before pushing.

**Pushing the tag is what publishes.** GitHub Actions builds the extension and the app bundle and
sends them to the Chrome Web Store (submitted for review) and Google Play (internal testing track),
and creates a GitHub release with both files attached.

If you say no at the prompt, everything stays local and it tells you how to undo it.

## Before the first one

The workflow skips whichever store it has no credentials for, so it is safe to run before any of
this is set up - you just get the built files on a GitHub release. Set these under
**Settings → Secrets and variables → Actions**.

**Chrome Web Store** - three values from a Google Cloud OAuth client with the Chrome Web Store API
enabled. The [chrome-webstore-upload-keys walkthrough](https://github.com/fregante/chrome-webstore-upload-keys)
gets you all three in a few minutes.

| secret |
|:--|
| `CHROME_CLIENT_ID` |
| `CHROME_CLIENT_SECRET` |
| `CHROME_REFRESH_TOKEN` |

**Google Play** - the signing key you already build with locally, plus a Play Console service
account with "Release to testing tracks".

| secret | value |
|:--|:--|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 pwdhash-release-key.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | the same values `Android/app/build.gradle.kts` already reads from |
| `ANDROID_KEY_ALIAS` | `Android/gradle.properties` when you build a release by hand |
| `ANDROID_KEY_PASSWORD` | |

Keep the keystore itself out of the repository - `.gitignore` already excludes it - and keep a
backup somewhere other than a CI secret. Losing it means never updating the listing again.

### Rehearse it

Actions → **Release** → **Run workflow**, leaving `publish` unticked. It builds everything and
publishes nothing, so you can check the pipeline works before a tag ever exists.

## Changing what gets published

In `.github/workflows/release.yml`:

- **Chrome, without going live by itself** - drop `--auto-publish`, and the new version waits as a
  draft in the dashboard.
- **Play, a different track** - `track: internal` is set because the listing is still in testing.
  Change it when it goes public.
- **Play, without rolling out** - `status: draft` instead of `completed`.

## By hand

```bash
cd Chrome && ./build_zip.sh           # dist/PwdHash-Chrome-<version>.zip
cd Android && ./gradlew bundleRelease # app/build/outputs/bundle/release/app-release.aab
```

The bundle is only signed when the four `PWDHASH_RELEASE_*` values are set, as environment
variables or Gradle properties. Setting some but not all of them fails the build on purpose.
