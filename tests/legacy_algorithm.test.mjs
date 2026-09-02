import assert from "node:assert/strict";
import test from "node:test";
import { MASTER_PASSWORDS, originalLegacyPassword } from "./original.mjs";
import { extensionLegacyPassword } from "./extension_internals.mjs";
import { websiteLegacyPassword } from "./website_internals.mjs";

const DOMAINS = ["example.com", "bbc.com", "cam.ac.uk", "mintmobile.com"];

for (const [name, generate] of [
    ["extension", extensionLegacyPassword],
    ["website", websiteLegacyPassword]
]) {
    test(`${name} legacy passwords match the original`, () => {
        for (const domain of DOMAINS) {
            for (const masterPassword of MASTER_PASSWORDS) {
                assert.equal(
                    generate(masterPassword, domain),
                    originalLegacyPassword(masterPassword, domain),
                    `${name}: ${JSON.stringify(masterPassword)} @ ${domain}`
                );
            }
        }
    });
}
