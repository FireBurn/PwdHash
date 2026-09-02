import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { originalDomain } from "./original.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const domains = (await import("../Chrome/src/js/domain-extractor.js")).default;
domains.setPublicSuffixRules(await read("Chrome/src/data/public-suffix-list.txt"));

test("the extension and the website share one domain extractor", async () => {
    assert.equal(
        await read("docs/js/domain-extractor.js"),
        await read("Chrome/src/js/domain-extractor.js"),
        "docs/js/domain-extractor.js has drifted from Chrome/src/js/domain-extractor.js"
    );
});

test("every platform pins the same public suffix list", async () => {
    const chrome = await read("Chrome/src/data/public-suffix-list.txt");
    for (const copy of [
        "docs/data/public-suffix-list.txt",
        "Android/app/src/main/assets/public-suffix-list.txt"
    ]) {
        assert.equal(await read(copy), chrome, `${copy} has drifted from the Chrome copy`);
    }
});

test("legacy extraction matches the original for every shape of input", () => {
    const inputs = [
        "example.com", "www.bbc.com", "login.cam.ac.uk", "www.example.me.uk", "www.bbc.co.uk",
        "a.b.c.example.com", "shop.example.com.au", "localhost", "192.168.0.1", "www.ck",
        "https://www.bbc.com/news", "http://example.com/", "https://a.b.example.co.uk/x?y=z",
        "example.com:8443", "https://WWW.Example.CO.UK/login", "one.two.three.four.five.co.uk",
        "xn--mnchen-3ya.de", "www.xn--mnchen-3ya.de", "uk.com", "www.mysite.uk.com"
    ];
    for (const input of inputs) {
        assert.equal(domains.extractLegacyDomain(input), originalDomain(input), input);
    }
});

test("the domain vectors are reproduced", async () => {
    const content = await read("tests/domain-vectors.txt");
    const lines = content.split("\n").filter((line) => line && !line.startsWith("#"));
    assert.ok(lines.length > 0, "no domain vectors");

    for (const line of lines) {
        const [input, legacy, modern] = line
            .split(" ")
            .map((value) => Buffer.from(value, "base64").toString("utf8"));
        assert.equal(domains.extractLegacyDomain(input), legacy, `legacy: ${input}`);
        assert.equal(
            domains.extractModernDomain(domains.hostFromInput(input)),
            modern,
            `modern: ${input}`
        );
    }
});

test("modern extraction handles the public suffix list's own edge cases", () => {
    const modern = (host) => domains.extractModernDomain(domains.hostFromInput(host));
    assert.equal(modern("bar.foo.ck"), "bar.foo.ck", "wildcard rule *.ck");
    assert.equal(modern("www.ck"), "www.ck", "exception rule !www.ck");
    assert.equal(modern("foo.city.kobe.jp"), "city.kobe.jp", "exception rule !city.kobe.jp");
    assert.equal(modern("com"), "com", "a host that is itself a public suffix");
    assert.equal(modern("[2001:db8::1]"), "[2001:db8::1]", "IPv6 literal");
    assert.equal(modern("10.0.0.1"), "10.0.0.1", "IPv4 literal");
    assert.equal(modern(""), "", "empty input");
    assert.equal(modern("has spaces"), "", "unparseable input");
});
