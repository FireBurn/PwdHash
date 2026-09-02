#!/usr/bin/env bash
#
# Cuts a release. One argument, the new version:
#
#     ./tools/release.sh 4.0.1
#
# Bumps both version numbers, checks the release notes exist, runs every test, commits, tags and
# pushes. Pushing the tag is what publishes: GitHub Actions builds the extension and the app and
# sends them to the two stores. Nothing is pushed until you confirm.
set -euo pipefail

cd "$(dirname "$0")/.."

version=${1:-}
if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Usage: ./tools/release.sh <version>    e.g. ./tools/release.sh 4.0.1" >&2
    exit 1
fi

tag="v$version"
notes="RELEASE_NOTES_$version.md"
manifest="Chrome/src/manifest.json"
gradle="Android/app/build.gradle.kts"

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    echo "Tag $tag already exists." >&2
    exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
[[ $branch == main ]] || echo "Note: releasing from '$branch', not main."

# --- release notes, scaffolded from the commits if they are not written yet ------------------
if [[ ! -f $notes ]]; then
    previous=$(git describe --tags --abbrev=0 2>/dev/null || true)
    {
        echo "# PwdHash $version"
        echo
        echo "**Does this change any generated password? If so, say which sites and why.**"
        echo
        echo "## Changes"
        echo
        git log --reverse --format='- %s' ${previous:+"$previous"..}HEAD
    } > "$notes"
    echo
    echo "Wrote a draft $notes from the commits since ${previous:-the beginning}."
    echo "Edit it, then run this again."
    exit 1
fi

# --- version numbers -------------------------------------------------------------------------
python3 - "$version" "$manifest" "$gradle" <<'PY'
import re, sys

version, manifest_path, gradle_path = sys.argv[1:4]

manifest = open(manifest_path).read()
manifest, count = re.subn(r'("version":\s*")[^"]+(")', rf'\g<1>{version}\g<2>', manifest, count=1)
assert count == 1, f"no version field in {manifest_path}"
open(manifest_path, "w").write(manifest)

gradle = open(gradle_path).read()
gradle, count = re.subn(r'(versionName = ")[^"]+(")', rf'\g<1>{version}\g<2>', gradle, count=1)
assert count == 1, f"no versionName in {gradle_path}"
# Play rejects a bundle whose versionCode it has seen before, so it only ever goes up.
code = int(re.search(r'versionCode = (\d+)', gradle).group(1))
gradle = re.sub(r'versionCode = \d+', f'versionCode = {code + 1}', gradle, count=1)
open(gradle_path, "w").write(gradle)
print(f"Version {version}, Android versionCode {code + 1}")
PY

# --- tests -------------------------------------------------------------------------------------
echo
echo "Testing the extension and the website..."
node --test tests/
echo "Testing the Android app..."
(cd Android && ./gradlew --quiet :app:testDebugUnitTest)

# --- commit, tag, push ---------------------------------------------------------------------------
git add "$manifest" "$gradle" "$notes"
git commit --quiet --message "Release $version"
git tag --annotate "$tag" --message "PwdHash $version"

echo
echo "Committed and tagged $tag. Pushing publishes:"
echo "  - Chrome Web Store, submitted for review"
echo "  - Google Play, to the internal testing track"
echo "  - a GitHub release with both files attached"
echo
read -r -p "Push $branch and $tag now? [y/N] " reply
if [[ $reply == [yY] ]]; then
    git push origin "$branch" "$tag"
    echo "Pushed. Watch it at: $(git remote get-url origin | sed 's#git@github.com:#https://github.com/#; s#\.git$##')/actions"
else
    echo "Left it local. When you are ready:  git push origin $branch $tag"
    echo "To undo:  git tag -d $tag && git reset --hard HEAD~1"
fi
