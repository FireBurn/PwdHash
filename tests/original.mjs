/**
 * Loads the vendored original PwdHash implementation so tests can generate their expectations from
 * the real thing. See tests/original/README.md.
 */
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = {};
vm.createContext(context);
for (const file of ["md5.js", "domain-extractor.js", "hashed-password.js"]) {
    const source = await readFile(new URL(`original/${file}`, import.meta.url), "utf8");
    vm.runInContext(source, context, { filename: `tests/original/${file}` });
}

/** The domain the original hashes with, given a host name or a full URL. */
export const originalDomain = (uri) => new context.SPH_DomainExtractor().extractDomain(uri);

/** The password the original produces, given a master password and an already-extracted domain. */
export const originalLegacyPassword = (masterPassword, domain) =>
    String(new context.SPH_HashedPassword(masterPassword, domain));

/**
 * Master passwords worth checking every implementation against.
 *
 * A master password of 24 characters or more exhausts the "extras" the original draws its padding
 * characters from, so the original starts emitting NUL bytes (or, when the master password is
 * alphanumeric, runs of "A"). That output is unpleasant but it is what the original produces, and
 * reproducing it exactly is the whole point of legacy mode.
 */
export const MASTER_PASSWORDS = [
    "a",
    "hunter2",
    "p@ssw0rd!",
    "correct horse battery staple",
    "café",
    "x".repeat(22),
    "x".repeat(30),
    "y".repeat(70)
];
