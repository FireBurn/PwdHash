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
    const hiddenSubmitFields = new WeakMap(); // Hidden fields that actually get submitted

    function activatePwdHash(field) {
        if (!fieldState.has(field)) {
            // Store original autocomplete
            const originalAutocomplete = field.getAttribute('autocomplete');

            // Tell Chrome this is a one-time code, not a password to save
            field.setAttribute('autocomplete', 'one-time-code');

            // Create a hidden field that will actually be submitted
            const hiddenField = document.createElement('input');
            hiddenField.type = 'password';
            hiddenField.name = field.name; // This field gets the name
            hiddenField.style.position = 'absolute';
            hiddenField.style.left = '-9999px';
            hiddenField.style.width = '1px';
            hiddenField.style.height = '1px';
            hiddenField.setAttribute('tabindex', '-1');
            hiddenField.setAttribute('aria-hidden', 'true');

            // Give the hidden field the proper autocomplete
            if (originalAutocomplete) {
                hiddenField.setAttribute('autocomplete', originalAutocomplete);
            } else {
                hiddenField.setAttribute('autocomplete', 'current-password');
            }

            // Insert hidden field into form
            field.form.appendChild(hiddenField);

            // Remove name and ID from visible field
            const originalName = field.name;
            const originalId = field.id;
            field.removeAttribute('name');
            field.removeAttribute('id');
            field.setAttribute('data-form-type', 'other');
            field.setAttribute('data-lpignore', 'true');
            field.setAttribute('data-pwdhash-active', 'true');

            fieldState.set(field, {
                originalBgColor: field.style.backgroundColor || '',
                originalName: originalName,
                originalId: originalId,
                originalAutocomplete: originalAutocomplete,
                isHashed: false
            });
            hiddenSubmitFields.set(field, hiddenField);

            field.style.backgroundColor = PWDHASH_ACTIVE_COLOR;
        }
        field.value = field.value.substring(2);
    }

    async function applyHash(field) {
        console.log('PwdHash: applyHash called', {
            hasFieldState: fieldState.has(field),
            fieldValue: field.value,
            isHashed: fieldState.has(field) ? fieldState.get(field).isHashed : 'N/A'
        });

        if (!fieldState.has(field)) return;

        const state = fieldState.get(field);

        // If already hashed, don't hash again
        if (state.isHashed) {
            console.log('PwdHash: field already hashed, skipping');
            return;
        }

        const masterPassword = field.value;

        if (!masterPassword) {
            console.log('PwdHash: no password in field, cleaning up');
            field.style.backgroundColor = state.originalBgColor;

            // Remove hidden field
            const hiddenField = hiddenSubmitFields.get(field);
            if (hiddenField && hiddenField.parentNode) {
                hiddenField.parentNode.removeChild(hiddenField);
            }
            hiddenSubmitFields.delete(field);

            // Restore all original attributes
            if (state.originalName) {
                field.name = state.originalName;
            }
            if (state.originalId) {
                field.id = state.originalId;
            }
            if (state.originalAutocomplete) {
                field.setAttribute('autocomplete', state.originalAutocomplete);
            } else {
                field.removeAttribute('autocomplete');
            }
            field.removeAttribute('data-pwdhash-active');
            field.removeAttribute('data-form-type');
            field.removeAttribute('data-lpignore');

            fieldState.delete(field);
            return;
        }

        console.log('PwdHash: generating hash for domain:', PwdHashUtils.getSite(window.location.href));
        const domain = PwdHashUtils.getSite(window.location.href);
        const hashedPassword = await generateSecurePassword(masterPassword, domain);

        if (hashedPassword) {
            console.log('PwdHash: hash generated, setting values');

            // Set hashed password in BOTH fields
            field.value = hashedPassword; // Visible for user to see

            const hiddenField = hiddenSubmitFields.get(field);
            if (hiddenField) {
                hiddenField.value = hashedPassword; // This one gets submitted
                console.log('PwdHash: Set hashed password in hidden submit field');
            }

            // Mark as hashed and restore the background
            state.isHashed = true;
            state.hashedPassword = hashedPassword;
            field.style.backgroundColor = state.originalBgColor;

            // Send a message to the service worker for UI feedback.
            try {
                chrome.runtime.sendMessage({ type: 'PWDHASH_GENERATED' });
                chrome.storage.sync.get({ alertPwd: false }, (items) => {
                    if (chrome.runtime.lastError) return;
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

    // Handle input events after hashing to prevent reverting to master password
    function handlePostHashInput(field) {
        const state = fieldState.get(field);
        if (state && state.isHashed && state.hashedPassword) {
            // If the field value changes after hashing (e.g., from show/hide toggle),
            // restore the hashed password
            if (field.value !== state.hashedPassword) {
                field.value = state.hashedPassword;
            }
        }
    }

    // Use event delegation on the document to catch all relevant events.
    document.addEventListener('input', (event) => {
        if (PwdHashUtils.isPasswordField(event.target)) {
            if (event.target.value.startsWith('@@')) {
                activatePwdHash(event.target);
            } else {
                // Check if this field has been hashed
                handlePostHashInput(event.target);
            }
        }
    }, true);

    // Hash on Enter key press BEFORE the form submission happens
    document.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && PwdHashUtils.isPasswordField(event.target)) {
            const field = event.target;
            if (fieldState.has(field) && !fieldState.get(field).isHashed) {
                // Prevent form submission while we hash
                event.preventDefault();
                event.stopImmediatePropagation();

                // Hash the password
                await applyHash(field);

                // Small delay to ensure the value is updated
                await new Promise(resolve => setTimeout(resolve, 10));

                // Now trigger the form submission
                const form = field.form;
                if (form) {
                    // Use requestSubmit if available (better for validation)
                    if (form.requestSubmit) {
                        form.requestSubmit();
                    } else {
                        form.submit();
                    }
                }
            }
        }
    }, true);

    document.addEventListener('blur', (event) => {
        if (PwdHashUtils.isPasswordField(event.target)) {
            console.log('PwdHash: blur event detected, calling applyHash');
            applyHash(event.target);
        }
    }, true);

    // Intercept clicks on submit buttons to hash password before Chrome captures it
    document.addEventListener('click', async (event) => {
        const target = event.target;

        // Check if this is a submit button
        const isSubmitButton = (
            (target instanceof HTMLButtonElement && target.type === 'submit') ||
            (target instanceof HTMLInputElement && target.type === 'submit') ||
            target.closest('button[type="submit"]') ||
            target.closest('input[type="submit"]')
        );

        if (isSubmitButton) {
            // Find the form
            const form = target.closest('form') || (target instanceof HTMLInputElement && target.form);
            if (!form) return;

            // Find password fields in the form that need hashing
            const passwordFields = Array.from(form.elements).filter(el =>
                PwdHashUtils.isPasswordField(el) && fieldState.has(el) && !fieldState.get(el).isHashed
            );

            if (passwordFields.length > 0) {
                // Prevent the default action temporarily
                event.preventDefault();
                event.stopImmediatePropagation();

                // Hash all password fields
                for (const field of passwordFields) {
                    await applyHash(field);
                }

                // Small delay to ensure DOM is updated
                await new Promise(resolve => setTimeout(resolve, 50));

                // Now actually click the button
                // Create a new click event
                const newEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });

                // Mark it to avoid infinite loop
                Object.defineProperty(newEvent, '__pwdhash_processed', { value: true });
                target.dispatchEvent(newEvent);
            }
        }
    }, true);

    // Skip our re-dispatched events
    document.addEventListener('click', (event) => {
        if (event.__pwdhash_processed) {
            event.stopImmediatePropagation();
        }
    }, false);

    // Handle focus events to clean up state when user returns to edit
    document.addEventListener('focus', (event) => {
        if (PwdHashUtils.isPasswordField(event.target)) {
            const state = fieldState.get(event.target);
            // If field is hashed and user focuses it, allow them to edit
            // (they can clear it and start over with @@)
            if (state && state.isHashed) {
                // Keep the hashed password visible until they make changes
                // This allows copy/paste while preventing accidental edits
            }
        }
    }, true);

    // Intercept form submissions to ensure password is hashed before Chrome captures it
    document.addEventListener('submit', async (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;

        // Find all password fields in the form that need hashing
        const passwordFields = Array.from(form.elements).filter(el =>
            PwdHashUtils.isPasswordField(el) && fieldState.has(el) && !fieldState.get(el).isHashed
        );

        if (passwordFields.length > 0) {
            // Prevent the form from submitting immediately
            event.preventDefault();
            event.stopImmediatePropagation();

            console.log('PwdHash: Form submit intercepted, hashing passwords');

            // Hash all password fields (this will populate the hidden fields)
            for (const field of passwordFields) {
                await applyHash(field);
            }

            // Small delay to ensure values are updated
            await new Promise(resolve => setTimeout(resolve, 10));

            console.log('PwdHash: Submitting form with hidden hashed password fields');
            // Now actually submit the form
            // The hidden fields (with the hashed passwords) will be submitted
            // The visible fields (without name attributes) will be ignored
            HTMLFormElement.prototype.submit.call(form);
        }
    }, true);

})();
