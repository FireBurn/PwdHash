// PwdHash Service Worker
// In Manifest V3, this replaces the old background page.

// Listen for the extension being installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default settings on fresh install
        // We default to 'modern' (PBKDF2) for security
        chrome.storage.sync.set({
            passwordMode: 'modern',
            alertPwd: false
        });
    }
});

// The content script normally fetches the pinned public suffix list itself. If a page's
// environment stops it doing that, it asks here instead: the service worker can always read the
// extension's own files. Without the list, modern mode cannot generate a password at all.
const PUBLIC_SUFFIX_LIST_PATH = 'data/public-suffix-list.txt';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'pwdhash:public-suffix-list') return undefined;

    fetch(chrome.runtime.getURL(PUBLIC_SUFFIX_LIST_PATH))
        .then((response) => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        })
        .then((text) => sendResponse({ text: text }))
        .catch((error) => sendResponse({ error: String(error) }));

    return true; // Keep the message channel open for the asynchronous reply.
});
