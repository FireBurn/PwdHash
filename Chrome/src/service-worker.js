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
        console.log("PwdHash installed: Defaults set.");
    }
});
