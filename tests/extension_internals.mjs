/** The algorithms the extension ships, loaded straight from the file the extension loads. */
const algorithms = (await import("../Chrome/src/js/pwdhash-algorithms.js")).default;

export const extensionLegacyPassword = algorithms.generateLegacyPassword;
export const extensionModernPassword = algorithms.generateSecurePassword;
