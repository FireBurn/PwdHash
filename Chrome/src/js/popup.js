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

    if (tab && tab.url) {
        try {
            const urlObj = new URL(tab.url);

            // Show full hostname in "Active for"
            domainEl.textContent = urlObj.hostname;

            // Show registrable domain in "Hashing for"
            const effectiveDomain = getSite(tab.url);
            if (effectiveDomain) {
                hashingDomainEl.textContent = effectiveDomain;
            } else {
                hashingDomainEl.textContent = "(Invalid Domain)";
            }
        } catch (e) {
            domainEl.textContent = "Not available";
            hashingDomainEl.textContent = "-";
        }
    } else {
        domainEl.textContent = "Not available";
        hashingDomainEl.textContent = "-";
    }

    // 2. Load current mode setting
    chrome.storage.sync.get(['passwordMode'], (result) => {
        const currentMode = result.passwordMode || 'modern';
        updateModeUI(currentMode);
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

/**
 * Extracts a registrable domain from a given URL string.
 * This matches the Android logic: handles 2-part TLDs (co.uk) and subdomains.
 */
function getSite(url) {
    try {
        const hostname = new URL(url).hostname;

        // Handle IP addresses or simple hostnames
        if (!hostname.includes('.')) return hostname;

        const parts = hostname.split('.').reverse();
        if (parts.length <= 1) return hostname;

        let domain = parts[1] + '.' + parts[0];
        const commonSecondLevels = ['co', 'com', 'org', 'net', 'gov', 'edu'];

        // If we have a 2-part TLD (e.g. .co.uk), grab the 3rd part
        if (parts.length > 2 && commonSecondLevels.includes(parts[1])) {
            domain = parts[2] + '.' + domain;
        }

        return domain;
    } catch (e) {
        return null;
    }
}
