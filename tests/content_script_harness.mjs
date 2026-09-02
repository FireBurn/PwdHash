// Minimal DOM stand-in good enough to drive the PwdHash content script's event handlers.
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

class Node {
    constructor() { this.children = []; this.parentNode = null; this.attributes = new Map(); this.style = {}; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; }
    insertBefore(c, ref) { c.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1;
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; }
    setAttribute(k, v) { this.attributes.set(k, String(v)); if (k === 'name') this._name = String(v); }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    removeAttribute(k) { this.attributes.delete(k); if (k === 'name') this._name = ''; }
    get nextSibling() { const s = this.parentNode?.children ?? []; return s[s.indexOf(this) + 1] ?? null; }
    closest() { return null; }
}
class HTMLInputElement extends Node {
    constructor() { super(); this.type = 'text'; this._value = ''; this._name = ''; this.form = null; }
    // A real input keeps value behind an accessor on the prototype, and the content script goes
    // through that setter deliberately, so model it rather than using a plain property.
    get value() { return this._value; }
    set value(v) { this._value = String(v); }
    get name() { return this._name; }
    set name(v) { this._name = String(v); this.attributes.set('name', String(v)); }
}
class HTMLFormElement extends Node {
    constructor() { super(); this.elements = []; this.submitted = 0; }
    submit() { this.submitted++; }
    requestSubmit() { this.submitted++; }
}
class Element extends Node {}

class Event {
    constructor(type, options = {}) {
        this.type = type;
        this.bubbles = Boolean(options.bubbles);
        this.isTrusted = false;
        this.defaultPrevented = false;
    }
    preventDefault() { this.defaultPrevented = true; }
    stopImmediatePropagation() {}
}

const listeners = { capture: {}, bubble: {} };

/** A capture listener on the document sees events dispatched at any node, as in a real DOM. */
Node.prototype.dispatchEvent = function (event) {
    event.target = this;
    for (const fn of listeners.capture[event.type] || []) fn(event);
    for (const fn of listeners.bubble[event.type] || []) fn(event);
    return !event.defaultPrevented;
};
const document = {
    addEventListener(type, fn, capture) {
        const bag = capture ? listeners.capture : listeners.bubble;
        (bag[type] ||= []).push(fn);
    },
    createElement(tag) {
        if (tag !== 'input') throw new Error('unexpected ' + tag);
        return new HTMLInputElement();
    }
};

async function dispatch(type, target, extra = {}) {
    const event = { type, target, isTrusted: true, preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() {}, defaultPrevented: false, ...extra };
    for (const fn of listeners.capture[type] || []) await fn(event);
    for (const fn of listeners.bubble[type] || []) await fn(event);
    // The blur handler kicks off PBKDF2 and returns before the promise settles.
    const settleMs = type === 'blur' ? 20 : 1;
    for (let i = 0; i < 50; i++) await new Promise(r => setTimeout(r, settleMs));
    return event;
}

const publicSuffixList = await readFile(
    new URL("../Chrome/src/data/public-suffix-list.txt", import.meta.url),
    "utf8"
);

const context = {
    window: {
        hasRunPwdHash: false,
        location: { href: 'https://my.mintmobile.com/login', hostname: 'my.mintmobile.com' }
    },
    // The content script fetches the pinned public suffix list from the packaged extension.
    fetch: async (url) => {
        if (!String(url).endsWith('data/public-suffix-list.txt')) throw new Error('unexpected ' + url);
        return { ok: true, text: async () => publicSuffixList };
    },
    Set,
    Promise,
    document, HTMLInputElement, HTMLFormElement, Element, Event, Object, URL, TextEncoder, Uint8Array,
    crypto: webcrypto, console, setTimeout,
    MouseEvent: class { constructor(t, i) { Object.assign(this, i); this.type = t; } },
    alert: (m) => { context.__alerts.push(m); },
    __alerts: [],
    chrome: {
        storage: { sync: { get: (defaults, cb) => cb ? cb(defaults) : Promise.resolve(defaults) } },
        runtime: { lastError: null, getURL: (path) => 'chrome-extension://test/' + path },
        i18n: { getMessage: () => '' }
    }
};
context.globalThis = context;
vm.createContext(context);
// Content scripts from one extension share a global scope, and the manifest lists the domain
// extractor first, so evaluate them in the same order into the same context.
for (const file of ["domain-extractor.js", "pwdhash.js"]) {
    vm.runInContext(
        await readFile(new URL(`../Chrome/src/js/${file}`, import.meta.url), "utf8"),
        context,
        { filename: `Chrome/src/js/${file}` }
    );
}

export { HTMLInputElement, HTMLFormElement, dispatch, context };

/** Registers a listener the way a page's own script would, after the content script's. */
export function addPageListener(type, fn) {
    (listeners.bubble[type] ||= []).push(fn);
}

export function makeLoginForm() {
    const form = new HTMLFormElement();
    const field = new HTMLInputElement();
    field.type = 'password';
    field.name = 'password';
    field.form = form;
    form.appendChild(field);
    form.elements.push(field);
    return { form, field };
}

// Types text into the field one character at a time, firing an input event per keystroke.
export async function type(field, text) {
    for (const ch of text) {
        field.value += ch;
        await dispatch('input', field);
    }
}
