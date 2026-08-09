import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../docs/js/main.js", import.meta.url), "utf8");
const context = {
    URL,
    TextEncoder,
    Uint8Array,
    alert: () => {},
    document: { addEventListener: () => {} },
    navigator: {},
    setTimeout,
    window: { crypto: webcrypto }
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "docs/js/main.js" });

test("web modern generator matches the shared cross-platform vector", async () => {
    const password = await context.generateModernPassword(
        "correct horse battery staple",
        "example.com"
    );
    assert.equal(password, "7e!CL_EcvqAo=es_");
});

test("web legacy generator accepts a one-character master password", () => {
    assert.notEqual(context.generateLegacyPassword("a", "example.com"), "");
});

test("web domain extraction retains established behavior", () => {
    assert.equal(context.getSite("https://login.example.co.uk/account"), "example.co.uk");
    assert.equal(context.getSite("https://mail.google.com/inbox"), "google.com");
});
