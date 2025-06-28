/**
 * Robustly checks if an element is a password field, even if its type is toggled to 'text'.
 * @param {HTMLElement} element The element to check.
 * @returns {boolean} True if it's likely a password field.
 */
function isPasswordField(element) {
    if (!(element && element.tagName && element.tagName.toLowerCase() === 'input')) {
        return false;
    }

    if (element.type === 'password') {
        return true;
    }

    if (element.type === 'text') {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const autocomplete = (element.autocomplete || '').toLowerCase();
        return name.includes('password') || id.includes('password') || autocomplete === 'current-password';
    }

    return false;
}

// --- "Mode-Switching" Event Strategy ---

document.addEventListener('input', (event) => {
    const target = event.target;
    if (isPasswordField(target)) {
        if (target.value.endsWith('@@')) {
            target.value = target.value.slice(0, -2);
            target.classList.add('pwdhash-active');
            target.dataset.pwdhashActive = 'true';
        }
    }
}, true);

document.addEventListener('change', (event) => {
    const target = event.target;

    if (!isPasswordField(target) || target.dataset.pwdhashActive !== 'true') {
        return;
    }

    delete target.dataset.pwdhashActive;
    const masterPassword = target.value;

    if (masterPassword) {
        target.value = "Hashing...";

        const domain = PasswordGenerator.getSite(window.location.hostname);

        chrome.runtime.sendMessage({
            action: "getHashedPassword",
            masterPassword: masterPassword,
            domain: domain
        }, (response) => {
            if (response && response.success) {
                target.value = response.hashedPassword;
                target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

                if (response.showAlert) {
                    const message = chrome.i18n.getMessage("pwdDisplay", [response.domain, response.hashedPassword]);
                    alert(message);
                }
            } else {
                console.error("PwdHash: Hashing failed.", response ? response.error : 'No response');
                target.value = masterPassword;
            }
            target.classList.remove('pwdhash-active');
        });
    } else {
         target.classList.remove('pwdhash-active');
    }
}, true);
