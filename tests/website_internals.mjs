/** Loads docs/js/main.js, the website's implementation, in a stubbed browser. */
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const context = {
    URL,
    TextEncoder,
    Uint8Array,
    alert: () => {},
    document: { addEventListener: () => {} },
    navigator: {},
    setTimeout,
    window: { crypto: webcrypto, addEventListener: () => {} }
};
vm.createContext(context);
vm.runInContext(
    await readFile(new URL("../docs/js/main.js", import.meta.url), "utf8"),
    context,
    { filename: "docs/js/main.js" }
);

export const websiteLegacyPassword = context.generateLegacyPassword;
export const websiteModernPassword = context.generateModernPassword;
