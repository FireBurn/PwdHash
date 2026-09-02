/**
 * The content script is an IIFE that exports nothing, because anything it exported would be
 * reachable from the page. To test its algorithms directly we lift the pure functions out of the
 * source and evaluate those on their own.
 */
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const FIRST = "async function generateSecurePassword";
const LAST = "const PWDHASH_ACTIVE_COLOR";

const source = await readFile(new URL("../Chrome/src/js/pwdhash.js", import.meta.url), "utf8");
const start = source.indexOf(FIRST);
const end = source.indexOf(LAST);
if (start < 0 || end < 0 || end < start) {
    throw new Error(`Could not find the algorithms in pwdhash.js (looked for ${FIRST} .. ${LAST})`);
}

const context = { crypto: webcrypto, TextEncoder, Uint8Array, URL };
vm.createContext(context);
vm.runInContext(
    source.slice(start, end) +
        ";globalThis.generateLegacyPassword = generateLegacyPassword;" +
        ";globalThis.generateSecurePassword = generateSecurePassword;" +
        ";globalThis.getSite = PwdHashUtils.getSite;",
    context,
    { filename: "Chrome/src/js/pwdhash.js" }
);

export const extensionLegacyPassword = context.generateLegacyPassword;
export const extensionModernPassword = context.generateSecurePassword;
export const extensionGetSite = context.getSite;
