/**
 * @file Logic for the PwdHash browser action popup.
 * @description Displays the domain of the current tab and provides an options link.
 */
document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const optionsBtn = document.getElementById('optionsBtn');

  optionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // Query for the active tab to display its status.
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0) {
        statusDiv.textContent = 'Could not determine active tab.';
        return;
    }
    const tab = tabs[0];
    if (tab.url && tab.url.startsWith('http')) {
        const domain = new URL(tab.url).hostname;
        const domainSpan = document.createElement('span');
        domainSpan.id = 'domain';
        domainSpan.textContent = domain;

        statusDiv.textContent = 'PwdHash is active for: ';
        statusDiv.appendChild(domainSpan);
    } else {
        statusDiv.textContent = 'PwdHash is not active on this page.';
    }
  });
});
