import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("every platform reports the same version", async () => {
    const manifest = JSON.parse(await read("Chrome/src/manifest.json"));
    const gradle = await read("Android/app/build.gradle.kts");
    const versionName = gradle.match(/versionName = "([^"]+)"/)[1];

    assert.equal(
        versionName,
        manifest.version,
        "Android versionName and the extension manifest version have to agree"
    );
});

test("the release notes for this version exist", async () => {
    const { version } = JSON.parse(await read("Chrome/src/manifest.json"));
    await assert.doesNotReject(
        access(new URL(`../RELEASE_NOTES_${version}.md`, import.meta.url)),
        `write RELEASE_NOTES_${version}.md before tagging`
    );
});
