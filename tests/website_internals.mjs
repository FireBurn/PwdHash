/**
 * The algorithms the website ships. It is meant to be a byte-identical copy of the extension's,
 * which domain_extraction.test.mjs checks, but load it separately so these vectors would still
 * catch it if it were not.
 */
const algorithms = (await import("../docs/js/pwdhash-algorithms.js")).default;

export const websiteLegacyPassword = algorithms.generateLegacyPassword;
export const websiteModernPassword = algorithms.generateSecurePassword;
