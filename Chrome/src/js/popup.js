/**
 * @file Logic for the PwdHash browser action popup.
 * @description Displays the domain and allows switching between Modern/Legacy mode.
 */
document.addEventListener('DOMContentLoaded', function() {
  const domainDiv = document.getElementById('domain');
  const optionsBtn = document.getElementById('optionsBtn');
  const modernOption = document.getElementById('mode-modern');
  const legacyOption = document.getElementById('mode-legacy');

  // Open options page
  optionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // Load current mode setting
  chrome.storage.sync.get({ passwordMode: 'modern' }, function(items) {
    updateModeUI(items.passwordMode);
  });

  // Handle mode selection
  modernOption.addEventListener('click', function() {
    setMode('modern');
  });

  legacyOption.addEventListener('click', function() {
    setMode('legacy');
  });

  function setMode(mode) {
    chrome.storage.sync.set({ passwordMode: mode }, function() {
      updateModeUI(mode);
    });
  }

  function updateModeUI(mode) {
    modernOption.classList.remove('selected');
    legacyOption.classList.remove('selected');

    if (mode === 'modern') {
      modernOption.classList.add('selected');
    } else {
      legacyOption.classList.add('selected');
    }
  }

  // Display current tab domain
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0) {
        domainDiv.textContent = 'No active tab';
        return;
    }
    const tab = tabs[0];
    if (tab.url && tab.url.startsWith('http')) {
        const domain = new URL(tab.url).hostname;
        domainDiv.textContent = domain;
    } else {
        domainDiv.textContent = 'Not available on this page';
    }
  });
});
