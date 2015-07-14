/**
 * @file PwdHash Service Worker (Manifest V3)
 * @description Handles background tasks for the extension, including managing
 * the browser action icon state and setting default options on installation.
 */

// Define icon paths for different states using the cleaned-up icon names.
const ICONS = {
  ACTIVE: { "19": "icons/icon_active.png" },
  INACTIVE: { "19": "icons/icon_inactive.png" }
};

/**
 * Updates the browser action icon and title for a given tab.
 * @param {number} tabId The ID of the tab to update.
 */
function updateActionState(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    // Check if the tab still exists and has a URL.
    if (chrome.runtime.lastError || !tab || !tab.url) {
      chrome.action.setIcon({ path: ICONS.INACTIVE, tabId: tabId });
      chrome.action.setTitle({ title: "PwdHash (inactive)", tabId: tabId });
      return;
    }

    // Activate for web pages, deactivate for chrome://, file://, etc.
    if (tab.url.startsWith('http')) {
      chrome.action.setIcon({ path: ICONS.ACTIVE, tabId: tabId });
      chrome.action.setTitle({ title: "PwdHash (active)", tabId: tabId });
    } else {
      chrome.action.setIcon({ path: ICONS.INACTIVE, tabId: tabId });
      chrome.action.setTitle({ title: "PwdHash (inactive)", tabId: tabId });
    }
  });
}

// Set default settings on first installation.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    alertPwd: false
  });
});

// Update icon when a tab is activated or its URL changes.
chrome.tabs.onActivated.addListener(activeInfo => updateActionState(activeInfo.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // We only need to update if the URL has changed to avoid unnecessary churn.
  if (changeInfo.url) {
    updateActionState(tabId);
  }
});

// Listen for messages from content scripts.
chrome.runtime.onMessage.addListener((request, sender) => {
  // When a password is generated, update the title to give feedback.
  // We keep the "active" icon as it signifies success.
  if (request.type === 'PWDHASH_GENERATED' && sender.tab) {
    chrome.action.setTitle({
      title: "PwdHash: Password generated!",
      tabId: sender.tab.id
    });
  }
});
