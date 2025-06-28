browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getHashedPassword") {
        const { masterPassword, domain } = request;

        // Ensure we have a valid domain to hash
        if (!domain) {
            console.error("PwdHash: Cannot hash a null or invalid domain.");
            sendResponse({ success: false, error: "Invalid domain" });
            return false; // No async response needed
        }

        PasswordGenerator.generateSecurePassword(masterPassword, domain)
            .then(hashedPassword => {
                // On success, get the alert setting and send back all data
                browser.storage.sync.get({ alertPwd: false }).then(items => {
                    sendResponse({
                        success: true,
                        hashedPassword: hashedPassword,
                        showAlert: items.alertPwd,
                        domain: domain
                    });
                });
            })
            .catch(error => {
                // On failure, send back an error message
                console.error("PwdHash Error:", error);
                sendResponse({ success: false, error: error.message });
            });

        // Return true to indicate that the response will be sent asynchronously.
        return true;
    }
});

function updateIcon() {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0] && tabs[0].id) {
            const tab = tabs[0];
            const iconPath = (tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https://'))) 
                ? 'icons/icon' 
                : 'icons/icon_inactive';
            
            browser.action.setIcon({
                tabId: tab.id,
                path: {
                    19: `${iconPath}_19.png`,
                    38: `${iconPath}_38.png`
                }
            });
        }
    }).catch(e => console.error("PwdHash: Could not set icon.", e));
}

// Update icon when a tab is activated or its URL changes
browser.tabs.onActivated.addListener(activeInfo => {
    updateIcon();
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        updateIcon();
    }
});

// Set the initial icon
updateIcon();
