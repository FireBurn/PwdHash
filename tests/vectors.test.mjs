import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extensionLegacyPassword, extensionModernPassword } from "./extension_internals.mjs";
import { websiteLegacyPassword, websiteModernPassword } from "./website_internals.mjs";

const from64 = (value) => Buffer.from(value, "base64").toString("utf8");

export async function readVectors() {
    const content = await readFile(new URL("vectors.txt", import.meta.url), "utf8");
    return content
        .split("\n")
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
            const [kind, master, domain, expected] = line.split(" ");
            return {
                kind,
                master: from64(master),
                domain: from64(domain),
                expected: from64(expected)
            };
        });
}

const vectors = await readVectors();

test("the vectors files are up to date", async () => {
    const files = ["vectors.txt", "domain-vectors.txt"];
    const before = await Promise.all(
        files.map((file) => readFile(new URL(file, import.meta.url), "utf8"))
    );
    await import("./generate_vectors.mjs");
    for (const [index, file] of files.entries()) {
        const after = await readFile(new URL(file, import.meta.url), "utf8");
        assert.equal(after, before[index], `run \`node tests/generate_vectors.mjs\` and commit ${file}`);
    }
});

for (const [name, legacy, modern] of [
    ["extension", extensionLegacyPassword, extensionModernPassword],
    ["website", websiteLegacyPassword, websiteModernPassword]
]) {
    test(`${name} matches the shared vectors`, async () => {
        for (const vector of vectors) {
            const generate = vector.kind === "legacy" ? legacy : modern;
            assert.equal(
                await generate(vector.master, vector.domain),
                vector.expected,
                `${name} ${vector.kind}: ${JSON.stringify(vector.master)} @ ${vector.domain}`
            );
        }
    });
}
