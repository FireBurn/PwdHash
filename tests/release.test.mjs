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

test("localised manifest fields resolve to real messages", async () => {
    const manifest = JSON.parse(await read("Chrome/src/manifest.json"));
    const messages = JSON.parse(await read("Chrome/src/_locales/en/messages.json"));

    for (const field of ["name", "description"]) {
        const value = manifest[field];
        const key = /^__MSG_(.+)__$/.exec(value);
        assert.ok(key, `manifest ${field} should use a __MSG_ key, got ${value}`);
        assert.ok(messages[key[1]], `_locales/en is missing ${key[1]}, so ${field} would be blank`);
        assert.ok(messages[key[1]].message.length > 0, `${key[1]} has an empty message`);
    }
});
