# Cutting a release

Releases are driven by a tag. `.github/workflows/release.yml` builds the extension zip and the
Android app bundle, attaches both to a GitHub release, and publishes to the two stores when the
secrets below are configured. Without those secrets it still builds and attaches the artifacts, so
it is safe to run before anything is set up.

## Steps

1. Bump the version in **two** places - `Chrome/src/manifest.json` and
   `Android/app/build.gradle.kts` (`versionName`, and `versionCode` by one). A test fails if they
   disagree, and another fails if `RELEASE_NOTES_<version>.md` is missing.
2. Write `RELEASE_NOTES_<version>.md`. It becomes the body of the GitHub release.
   **If a generated password changes, say which sites and why**, and bump the major version.
3. `node --test tests/` and `cd Android && ./gradlew testDebugUnitTest`.
4. Tag and push:

   ```bash
   git tag v4.0.0
   git push origin v4.0.0
   ```

   The tag has to match the manifest version or the workflow stops before publishing anything.

`workflow_dispatch` runs the same build without a tag - useful for checking it works. It publishes
only if you tick the `publish` input.

## Secrets

Both stores are optional and independent. Set them under **Settings → Secrets and variables →
Actions**.

### Chrome Web Store

| secret | where it comes from |
|:--|:--|
| `CHROME_EXTENSION_ID` | `mdkkcmadlheiebifjmdcpmoladipmjeo` |
| `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` | a Google Cloud OAuth client with the Chrome Web Store API enabled |

The [chrome-webstore-upload-keys](https://github.com/fregante/chrome-webstore-upload-keys) walkthrough
covers getting all three in a few minutes. The upload uses `--auto-publish`, so the new version
goes for review immediately; drop that flag in the workflow if you would rather press the button
yourself.

### Google Play

| secret | where it comes from |
|:--|:--|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 pwdhash-release-key.jks` |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | the same values `Android/app/build.gradle.kts` already reads locally |
| `PLAY_SERVICE_ACCOUNT_JSON` | a Play Console service account with "Release to testing tracks" |

Keep the keystore itself out of the repository - `.gitignore` already excludes
`Android/app/pwdhash-release-key.jks`. Losing it means never updating the listing again, so keep a
backup somewhere other than a CI secret.

The workflow uploads to the **internal** track, because the listing is still in testing. Change
`track:` in `.github/workflows/release.yml` when it goes public.

## Doing it by hand

```bash
cd Chrome && ./build_zip.sh          # dist/PwdHash-Chrome-<version>.zip, upload at the CWS dashboard
cd Android && ./gradlew bundleRelease # app/build/outputs/bundle/release/app-release.aab
```

The Android bundle is only signed if the four `PWDHASH_RELEASE_*` values are set, as an environment
variable or a Gradle property. Setting some but not all of them fails the build on purpose.
