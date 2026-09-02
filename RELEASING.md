# Cutting a release

```bash
./tools/release.sh 4.0.1
```

Bumps the version in both places, scaffolds the release notes from your commits if you have not
written them, runs every test, builds both files, commits and tags. Then it prints where the two
files are and offers to push.

**Nothing reaches a store until you put it there.** GitHub has no access to your Google accounts
unless you give it some, so out of the box the workflow builds the files and stops.

## The simple way: upload them yourself

Take the two paths the script prints:

| | |
|:--|:--|
| `Chrome/dist/PwdHash-Chrome-<version>.zip` | <https://chrome.google.com/webstore/devconsole> |
| `Android/app/build/outputs/bundle/release/app-release.aab` | <https://play.google.com/console> |

Nothing to configure, nothing to keep secret, and no chance of a stray tag publishing something.
For a few releases a year this is probably less work than the alternative.

**The Android bundle has to be signed first.** `./gradlew bundleRelease` produces an *unsigned*
bundle unless it can find your upload key, and Play rejects unsigned bundles. Either put the four
values in `Android/gradle.properties` (which is gitignored):

```properties
PWDHASH_RELEASE_STORE_FILE=/path/to/pwdhash-release-key.jks
PWDHASH_RELEASE_STORE_PASSWORD=...
PWDHASH_RELEASE_KEY_ALIAS=...
PWDHASH_RELEASE_KEY_PASSWORD=...
```

...or keep using Android Studio's **Build → Generate Signed App Bundle**. The script checks and
tells you which one you got. Setting some but not all four fails the build on purpose.

## The automated way: let GitHub upload for you

Worth it if you release often enough to resent the clicking. It needs two grants of access, each
one a credential you create and paste into **Settings → Secrets and variables → Actions**. Once
they exist, pushing a tag uploads to both stores by itself.

### Chrome Web Store - about ten minutes

A Google Cloud OAuth client, authorised once by you, produces a refresh token that lets a machine
upload as you. The [chrome-webstore-upload-keys walkthrough](https://github.com/fregante/chrome-webstore-upload-keys)
covers it step by step and hands you all three values.

| secret |
|:--|
| `CHROME_CLIENT_ID` |
| `CHROME_CLIENT_SECRET` |
| `CHROME_REFRESH_TOKEN` |

### Google Play - about twenty minutes, fiddlier

Play does not do refresh tokens. You create a *service account* - a robot Google account - and
invite it into Play Console:

1. Play Console → **Setup → API access** → create a new service account (it sends you to Google
   Cloud), then create a JSON key for it and download that file.
2. Back in Play Console, grant the account access with the **Release to testing tracks**
   permission for this app.
3. Paste the whole JSON file as `PLAY_SERVICE_ACCOUNT_JSON`.

CI also needs your upload key, because Play only accepts a bundle signed with it:

| secret | value |
|:--|:--|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 /path/to/pwdhash-release-key.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | |
| `ANDROID_KEY_ALIAS` | |
| `ANDROID_KEY_PASSWORD` | |

Keep the keystore out of the repository, and keep a backup somewhere other than a CI secret -
losing it means never updating the listing again.

### Try it before trusting it

Actions → **Release** → **Run workflow**, leaving `publish` unticked. It builds everything and
publishes nothing, so you can watch the pipeline work while the stores stay untouched.

### Changing what it does

In `.github/workflows/release.yml`:

- **Chrome, without going live by itself** - drop `--auto-publish` and the version waits as a draft
  in the dashboard.
- **Play, a different track** - `track: internal` is set because the listing is still in testing.
- **Play, without rolling out** - `status: draft` instead of `completed`.
