/**
 * Refreshes the pinned Public Suffix List snapshot used by modern (PBKDF2) mode.
 *
 * THIS CHANGES GENERATED PASSWORDS. The snapshot is pinned on purpose: if each platform tracked
 * the live list, a rule added upstream would silently change someone's password, and the three
 * platforms would drift apart between releases. Run this only as a deliberate, released change,
 * and say so in the release notes. See docs/DOMAIN-RULES.md.
 *
 * Run with:  node tools/update-public-suffix-list.mjs
 */
import { writeFile } from "node:fs/promises";

const SOURCE = "https://publicsuffix.org/list/public_suffix_list.dat";

const DESTINATIONS = [
    "Chrome/src/data/public-suffix-list.txt",
    "docs/data/public-suffix-list.txt",
    "Android/app/src/main/assets/public-suffix-list.txt"
];

/** Rules are matched against host names, which browsers hand us already punycoded. */
function toAscii(rule) {
    if (!/[^\x00-\x7f]/.test(rule)) return rule;
    if (rule.includes("*") || rule.startsWith("!")) {
        throw new Error(`Cannot punycode a wildcard or exception rule: ${rule}`);
    }
    const { hostname } = new URL(`http://${rule}`);
    return hostname;
}

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE} returned ${response.status}`);
const raw = await response.text();

const rules = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    // A rule of a single label says nothing the default rule does not already say: with no match,
    // the public suffix is the rightmost label. Dropping them halves the file for free.
    .filter((rule) => rule.replace(/^!/, "").split(".").length >= 2)
    .map(toAscii);

const duplicates = rules.length - new Set(rules).size;
if (duplicates) throw new Error(`${duplicates} duplicate rules after punycoding`);

const today = new Date().toISOString().slice(0, 10);
const content = `\
// Public Suffix List snapshot, pinned ${today}.
// Source: ${SOURCE}
//
// PINNED DATA. Changing this file changes the passwords modern mode generates. Update it only
// through tools/update-public-suffix-list.mjs, as a deliberate released change. See
// docs/DOMAIN-RULES.md.
//
// Only rules of two or more labels are kept; for everything else the default rule (the public
// suffix is the rightmost label) already gives the same answer. Rules are punycoded because that
// is the form host names arrive in. ${rules.length} rules.
${rules.join("\n")}
`;

for (const destination of DESTINATIONS) {
    await writeFile(new URL(`../${destination}`, import.meta.url), content);
}
console.log(`Pinned ${rules.length} rules to ${DESTINATIONS.length} locations`);
