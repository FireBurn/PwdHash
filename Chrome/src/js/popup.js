/**
 * @file Logic for the PwdHash browser action popup.
 * @description Displays the domain and allows switching between Modern/Legacy mode.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const domainEl = document.getElementById('domain');
    const hashingDomainEl = document.getElementById('hashing-domain');
    const modeModernBtn = document.getElementById('mode-modern');
    const modeLegacyBtn = document.getElementById('mode-legacy');
    const optionsBtn = document.getElementById('optionsBtn');

    // 1. Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabUrl = tab && tab.url ? tab.url : '';

    if (tabUrl) {
        try {
            domainEl.textContent = new URL(tabUrl).hostname;
        } catch (e) {
            domainEl.textContent = 'Not available';
        }
    } else {
        domainEl.textContent = 'Not available';
    }

    // The two modes salt with different domains, so the popup has to answer for the selected one.
    // It is the only place a user can see what the content script will actually hash with.
    let publicSuffixRules = null;
    try {
        publicSuffixRules = await PwdHashDomains.loadPublicSuffixRules(
            chrome.runtime.getURL('data/public-suffix-list.txt')
        );
    } catch (e) {
        publicSuffixRules = null;
    }

    function hashingDomainFor(mode) {
        if (!tabUrl) return '-';
        try {
            if (mode === 'legacy') return PwdHashDomains.extractLegacyDomain(tabUrl) || '-';
            if (!publicSuffixRules) return '(unavailable)';
            return PwdHashDomains.extractModernDomain(PwdHashDomains.hostFromInput(tabUrl)) || '-';
        } catch (e) {
            return '(unavailable)';
        }
    }

    // 2. Load current mode setting
    chrome.storage.sync.get(['passwordMode'], (result) => {
        updateModeUI(result.passwordMode || 'modern');
    });

    // 3. Handle Mode Switching
    modeModernBtn.addEventListener('click', () => {
        setMode('modern');
    });

    modeLegacyBtn.addEventListener('click', () => {
        setMode('legacy');
    });

    function setMode(mode) {
        chrome.storage.sync.set({ passwordMode: mode }, () => {
            updateModeUI(mode);
        });
    }

    function updateModeUI(mode) {
        if (mode === 'modern') {
            modeModernBtn.classList.add('selected');
            modeLegacyBtn.classList.remove('selected');
        } else {
            modeLegacyBtn.classList.add('selected');
            modeModernBtn.classList.remove('selected');
        }
        hashingDomainEl.textContent = hashingDomainFor(mode);
    }

    // 4. Handle Options Button
    optionsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('html/options.html'));
        }
    });
});
