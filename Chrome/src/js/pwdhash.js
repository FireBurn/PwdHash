/**
 * @file PwdHash Content Script (Modern PBKDF2 Algorithm)
 * @description This script is injected into web pages to detect the "@@" prefix.
 * It uses the modern, secure Web Crypto API to generate passwords via PBKDF2 and SHA-256.
 */
(function() {
    // Prevents the script from running multiple times on the same page, e.g., in frames.
    if (window.hasRunPwdHash) {
        return;
    }
    window.hasRunPwdHash = true;

    /**
     * Generates a secure, deterministic, site-specific password using modern web standards.
     * @param {string} masterPassword - The user's master password.
     * @param {string} domain - The domain name to use as a salt.
     * @returns {Promise<string>} A promise that resolves to the generated password.
     */
    async function generateSecurePassword(masterPassword, domain) {
        const length = 16; // A secure, fixed length for generated passwords.
        const iterations = 300000; // A strong, modern iteration count for PBKDF2.

        // Define Character Sets
        const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
        const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const DIGIT_CHARS = '0123456789';
        const SYMBOL_CHARS = '!@#$%^&*()_-+=';
        const ALL_CHARS = LOWERCASE_CHARS + UPPERCASE_CHARS + DIGIT_CHARS + SYMBOL_CHARS;

        // 1. Derive a Cryptographic Key using PBKDF2 via the Web Crypto API.
        const salt = new TextEncoder().encode(domain);
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(masterPassword), { name: "PBKDF2" },
            false, ["deriveBits"]
        );
        const derivedBits = await crypto.subtle.deriveBits({
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256",
        }, keyMaterial, 256); // 32 bytes * 8 bits/byte

        const keyBytes = new Uint8Array(derivedBits);

        // 2. Build the Password, Enforcing Character Class Constraints.
        let passwordChars = [];
        passwordChars.push(LOWERCASE_CHARS[keyBytes[0] % LOWERCASE_CHARS.length]);
        passwordChars.push(UPPERCASE_CHARS[keyBytes[1] % UPPERCASE_CHARS.length]);
        passwordChars.push(DIGIT_CHARS[keyBytes[2] % DIGIT_CHARS.length]);
        passwordChars.push(SYMBOL_CHARS[keyBytes[3] % SYMBOL_CHARS.length]);

        for (let i = 4; i < length; i++) {
            const byteIndex = i % keyBytes.length;
            passwordChars.push(ALL_CHARS[keyBytes[byteIndex] % ALL_CHARS.length]);
        }

        // 3. Shuffle the Password using the key bytes for deterministic randomness.
        // This prevents the required characters from always appearing at the start.
        for (let i = passwordChars.length - 1; i > 0; i--) {
            const byteIndex = (length + i) % keyBytes.length; // Use different bytes for shuffling
            const j = keyBytes[byteIndex] % (i + 1);
            [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
        }

        return passwordChars.join('');
    }

    const PwdHashUtils = {
        /**
         * Extracts the registrable domain from a URL to use as a consistent salt.
         * @param {string} url - The full URL of the page.
         * @returns {string} The extracted domain, e.g., "google.com".
         */
        getSite: function(url) {
            try {
                const hostname = new URL(url).hostname;
                const parts = hostname.split('.').reverse();
                if (parts.length > 1) {
                    // Handle common TLDs like .co.uk, .com.au
                    if (parts.length > 2 && parts[1].length <= 3 && parts[0].length <= 3) {
                        return parts[2] + '.' + parts[1] + '.' + parts[0];
                    }
                    return parts[1] + '.' + parts[0];
                }
                return hostname;
            } catch (e) {
                return ''; // Return empty string for invalid URLs
            }
        },

        /**
         * Checks if a given element is a password input field.
         * @param {Element} element - The DOM element to check.
         * @returns {boolean} True if the element is likely a password field.
         */
        isPasswordField: function(element) {
            if (!(element instanceof HTMLInputElement)) return false;
            if (element.type === 'password') return true;
            // Modern forms often use type="text" with autocomplete hints.
            const autocomplete = (element.getAttribute('autocomplete') || '').toLowerCase();
            return autocomplete === 'current-password' || autocomplete === 'new-password';
        }
    };

    const PWDHASH_ACTIVE_COLOR = 'rgb(255, 255, 204)'; // Light yellow
    const fieldState = new WeakMap();

    function activatePwdHash(field) {
        if (!fieldState.has(field)) {
            fieldState.set(field, { originalBgColor: field.style.backgroundColor || '' });
            field.style.backgroundColor = PWDHASH_ACTIVE_COLOR;
        }
        field.value = field.value.substring(2);
    }

    async function applyHash(field) {
        if (!fieldState.has(field)) return;

        const masterPassword = field.value;
        const state = fieldState.get(field);

        // Always restore the original state and clean up.
        field.style.backgroundColor = state.originalBgColor;
        fieldState.delete(field);

        if (!masterPassword) return;

        const domain = PwdHashUtils.getSite(window.location.href);
        const hashedPassword = await generateSecurePassword(masterPassword, domain);

        if (hashedPassword) {
            field.value = hashedPassword;
            // Send a message to the service worker for UI feedback.
            // Use a try-catch to handle "context invalidated" errors on page navigation.
            try {
                chrome.runtime.sendMessage({ type: 'PWDHASH_GENERATED' });
                chrome.storage.sync.get({ alertPwd: false }, (items) => {
                    if (chrome.runtime.lastError) return; // Context is gone.
                    if (items.alertPwd) {
                        const message = chrome.i18n.getMessage('pwdDisplay', [domain, hashedPassword]);
                        alert(message);
                    }
                });
            } catch (e) {
                if (!e.message.includes('Extension context invalidated')) {
                    console.error("PwdHash: Unexpected error:", e);
                }
            }
        }
    }

    // Use event delegation on the document to catch all relevant events.
    document.addEventListener('input', (event) => {
        if (PwdHashUtils.isPasswordField(event.target) && event.target.value.startsWith('@@')) {
            activatePwdHash(event.target);
        }
    }, true);

    document.addEventListener('blur', (event) => {
        if (PwdHashUtils.isPasswordField(event.target)) {
            applyHash(event.target);
        }
    }, true);

})();
