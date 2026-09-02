/**
 * @file Logic for the PwdHash browser action popup.
 * @description Shows the domain the content script will hash with for the selected mode, lets that
 * domain be overridden for the current site, and switches between Modern and Legacy mode.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const domainEl = document.getElementById('domain');
    const hashingDomainEl = document.getElementById('hashing-domain');
    const overrideBadge = document.getElementById('override-badge');
    const overrideEdit = document.getElementById('override-edit');
    const overrideReset = document.getElementById('override-reset');
    const overrideEditor = document.getElementById('override-editor');
    const overrideInput = document.getElementById('override-input');
    const overrideSave = document.getElementById('override-save');
    const overrideCancel = document.getElementById('override-cancel');
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

    let currentMode = 'modern';
    let overrides = {};

    /** What the domain rule works out for this site, before any override. */
    function ruleDomainFor(mode) {
        if (!tabUrl) return '';
        try {
            if (mode === 'legacy') return PwdHashDomains.extractLegacyDomain(tabUrl);
            if (!publicSuffixRules) return '';
            return PwdHashDomains.extractModernDomain(PwdHashDomains.hostFromInput(tabUrl));
        } catch (e) {
            return '';
        }
    }

    function render() {
        const ruleDomain = ruleDomainFor(currentMode);
        const override = ruleDomain ? overrides[ruleDomain] : '';

        hashingDomainEl.textContent = override || ruleDomain || (tabUrl ? '(unavailable)' : '-');
        overrideBadge.hidden = !override;
        overrideReset.hidden = !override;
        overrideEdit.disabled = !ruleDomain;
        overrideEdit.textContent = override ? 'Change the domain' : 'Use a different domain';
    }

    function closeEditor() {
        overrideEditor.hidden = true;
    }

    async function saveOverrides(next) {
        overrides = next;
        try {
            await chrome.storage.sync.set({ domainOverrides: overrides });
        } catch (e) {
            hashingDomainEl.textContent = 'Could not save';
            return;
        }
        render();
    }

    overrideEdit.addEventListener('click', () => {
        const ruleDomain = ruleDomainFor(currentMode);
        if (!ruleDomain) return;
        overrideInput.value = overrides[ruleDomain] || ruleDomain;
        overrideEditor.hidden = false;
        overrideInput.focus();
        overrideInput.select();
    });

    overrideCancel.addEventListener('click', closeEditor);

    overrideSave.addEventListener('click', async () => {
        const ruleDomain = ruleDomainFor(currentMode);
        if (!ruleDomain) return;

        const next = Object.assign({}, overrides);
        const value = overrideInput.value.trim();
        // Saving the rule's own answer, or nothing at all, means "stop overriding this".
        if (!value || value === ruleDomain) {
            delete next[ruleDomain];
        } else {
            next[ruleDomain] = value;
        }
        closeEditor();
        await saveOverrides(next);
    });

    overrideInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') overrideSave.click();
        if (event.key === 'Escape') closeEditor();
    });

    overrideReset.addEventListener('click', async () => {
        const ruleDomain = ruleDomainFor(currentMode);
        const next = Object.assign({}, overrides);
        delete next[ruleDomain];
        closeEditor();
        await saveOverrides(next);
    });

    // 2. Load current settings
    chrome.storage.sync.get({ passwordMode: 'modern', domainOverrides: {} }, (result) => {
        overrides = result.domainOverrides || {};
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
        currentMode = mode;
        if (mode === 'modern') {
            modeModernBtn.classList.add('selected');
            modeLegacyBtn.classList.remove('selected');
        } else {
            modeLegacyBtn.classList.add('selected');
            modeModernBtn.classList.remove('selected');
        }
        // An override belongs to whatever the rule produced, so switching mode can change which
        // one applies. Close the editor rather than let it save against the wrong domain.
        closeEditor();
        render();
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
