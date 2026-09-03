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

    const PUBLIC_SUFFIX_LIST_PATH = 'data/public-suffix-list.txt';
    const PUBLIC_SUFFIX_LIST_MESSAGE = 'pwdhash:public-suffix-list';

    /** Reads the pinned list, falling back to the service worker if this page cannot fetch it. */
    async function loadPublicSuffixList() {
        try {
            return await PwdHashDomains.loadPublicSuffixRules(
                chrome.runtime.getURL(PUBLIC_SUFFIX_LIST_PATH)
            );
        } catch (_) {
            const response = await chrome.runtime.sendMessage({ type: PUBLIC_SUFFIX_LIST_MESSAGE });
            if (!response || !response.text) throw new Error('The public suffix list is unavailable');
            return PwdHashDomains.setPublicSuffixRules(response.text);
        }
    }

    /**
     * The domain to salt with. Legacy mode is handed the document's location exactly as the
     * original extension handed it to SPH_DomainExtractor; modern mode uses the parsed host name
     * and the pinned public suffix list. See js/domain-extractor.js.
     */
    async function resolveDomain(passwordMode) {
        if (passwordMode === 'legacy') {
            return PwdHashDomains.extractLegacyDomain(window.location.href);
        }
        await loadPublicSuffixList();
        return PwdHashDomains.extractModernDomain(window.location.hostname);
    }

    /**
     * No rule can know which credential a login form leads to. Two sites under one public suffix
     * usually belong to different people and should not share a password, but sometimes they are
     * one account, and sometimes one account is reachable from two unrelated hosts. The popup lets
     * the user say so, keyed on whatever the rule worked out.
     */
    function applyOverride(domain, overrides) {
        const override = overrides && overrides[domain];
        return typeof override === 'string' && override ? override : domain;
    }

    /**
     * The real target of an event. Inside an open shadow root the browser retargets event.target
     * to the host element, so a password field in a web component is invisible to a document
     * level listener unless you ask for the composed path. (A closed shadow root hides its
     * contents from composedPath as well; nothing can be done for those.)
     */
    function eventTarget(event) {
        if (typeof event.composedPath === 'function') {
            const path = event.composedPath();
            if (path.length) return path[0];
        }
        return event.target;
    }

    const PwdHashUtils = {
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

    // Set while we write a value ourselves, so our own listeners ignore the events that causes.
    let fieldBeingFilled = null;

    /**
     * Puts a value into a field the way a person would, as far as the page can tell.
     *
     * React, Vue and Angular keep their own copy of an input's value and submit that rather than
     * reading the DOM, and they only update it when they see an input event. Assigning to .value
     * leaves them holding whatever the user last typed - which here is the master password - so a
     * framework-driven login form would send the master password to the site. Going through the
     * native setter also keeps React's value tracker in step, so it does not swallow the change.
     */
    function setFieldValue(field, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        fieldBeingFilled = field;
        try {
            nativeSetter.call(field, value);
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        } finally {
            fieldBeingFilled = null;
        }
    }

    /**
     * Keystroke masking, ported from the original PwdHash's SPH_PasswordProtector.
     *
     * The page can read every character typed into one of its own password fields, so a site
     * could simply record the master password as it is entered and never need the hash at all.
     * The original's answer was to substitute a unique placeholder for each character: the field
     * - and therefore the page - only ever holds placeholders, and they are mapped back to the
     * real characters at hashing time. The page still learns how long the master password is,
     * which is unavoidable, but nothing else.
     *
     * Placeholders are handed out in order from 'A' upwards and never reused, so no two
     * characters share one and the map is a plain character-to-character lookup. That is what
     * makes editing work for free: delete a placeholder, or reorder them, and unmasking still
     * gives the right answer without tracking any positions. Past printable ASCII it continues
     * into the private use area rather than running out as the original did.
     *
     * The one gap is composed input (IMEs), which arrives already assembled and cannot be
     * intercepted per keystroke; those characters go in unmasked.
     */
    const MASK_FIRST = 0x41; // 'A' - and never '@', which would look like a fresh trigger
    const MASK_LAST = 0x7e; // '~'
    const MASK_OVERFLOW = 0xe000; // Private use area, for master passwords past 62 characters

    function nextMask(state) {
        const code = state.nextMaskCode;
        state.nextMaskCode = code === MASK_LAST ? MASK_OVERFLOW : code + 1;
        return String.fromCharCode(code);
    }

    /** Placeholders for a run of text, remembering what each one stands for. */
    function maskText(state, text) {
        let masked = '';
        for (const character of text) {
            const placeholder = nextMask(state);
            state.maskMap[placeholder] = character;
            masked += placeholder;
        }
        return masked;
    }

    /** Turns what the field holds back into what the user actually typed. */
    function unmask(state, value) {
        let real = '';
        for (const character of value) {
            real += Object.prototype.hasOwnProperty.call(state.maskMap, character)
                ? state.maskMap[character]
                : character;
        }
        return real;
    }

    function isMasking(field) {
        const state = fieldState.get(field);
        return Boolean(state && state.masking);
    }

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

            // Insert hidden field into form (check if form exists)
            if (field.form) {
                field.form.appendChild(hiddenField);
            } else {
                // If no form, insert after the field
                field.parentNode.insertBefore(hiddenField, field.nextSibling);
            }

            // Remove only the name so the visible master-password field is not submitted. Keep the
            // ID because page scripts, labels, and accessibility relationships may depend on it.
            const originalName = field.name;
            field.removeAttribute('name');
            field.setAttribute('data-form-type', 'other');
            field.setAttribute('data-lpignore', 'true');
            field.setAttribute('data-pwdhash-active', 'true');

            fieldState.set(field, {
                originalBgColor: field.style.backgroundColor || '',
                originalName: originalName,
                originalAutocomplete: originalAutocomplete,
                isHashed: false,
                hashPromise: null,
                masking: true,
                maskMap: Object.create(null),
                nextMaskCode: MASK_FIRST
            });
            hiddenSubmitFields.set(field, hiddenField);

            field.style.backgroundColor = PWDHASH_ACTIVE_COLOR;
        }

        // Anything already sitting after the "@@" was typed or pasted before we were armed, so
        // mask it now; from here on every insertion is masked as it arrives.
        const state = fieldState.get(field);
        const remainder = field.value.substring(2);
        fieldBeingFilled = field;
        try {
            field.value = state.masking ? maskText(state, remainder) : remainder;
        } finally {
            fieldBeingFilled = null;
        }
    }

    function deactivatePwdHash(field, state) {
        field.style.backgroundColor = state.originalBgColor;

        const hiddenField = hiddenSubmitFields.get(field);
        if (hiddenField && hiddenField.parentNode) {
            hiddenField.parentNode.removeChild(hiddenField);
        }
        hiddenSubmitFields.delete(field);

        if (state.originalName) {
            field.name = state.originalName;
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
    }

    async function performHash(field, state) {
        if (state.isHashed) return true;

        const masterPassword = state.masking ? unmask(state, field.value) : field.value;

        if (!masterPassword) {
            deactivatePwdHash(field, state);
            return false;
        }

        // The mode and any domain override both change which password comes out, so a settings
        // read that fails has to stop us rather than fall back to a default. A password salted
        // with the wrong domain looks perfectly fine and does not work.
        let settings;
        try {
            settings = await chrome.storage.sync.get({ passwordMode: 'modern', domainOverrides: {} });
        } catch (_) {
            return false;
        }

        const passwordMode = settings.passwordMode;

        let domain;
        try {
            domain = applyOverride(await resolveDomain(passwordMode), settings.domainOverrides);
        } catch (_) {
            return false;
        }
        if (!domain) return false;

        let hashedPassword;
        try {
            hashedPassword = passwordMode === 'legacy'
                ? PwdHashAlgorithms.generateLegacyPassword(masterPassword, domain)
                : await PwdHashAlgorithms.generateSecurePassword(masterPassword, domain);
        } catch (_) {
            return false;
        }
        if (!hashedPassword) return false;

        // Set the generated password in both fields. Only the hidden field retains a name, so the
        // page receives the generated password without ever receiving the master password.
        state.isHashed = true;
        state.hashedPassword = hashedPassword;
        state.masking = false; // The field holds the generated password now, not the master one.
        setFieldValue(field, hashedPassword);
        const hiddenField = hiddenSubmitFields.get(field);
        if (hiddenField) {
            hiddenField.value = hashedPassword;
        }
        field.style.backgroundColor = state.originalBgColor;

        try {
            chrome.storage.sync.get({ alertPwd: false }, (items) => {
                if (chrome.runtime.lastError) return;
                if (items.alertPwd) {
                    const message = chrome.i18n.getMessage('pwdDisplay', [domain, hashedPassword]);
                    alert(message);
                }
            });
        } catch (_) {
            // The extension context can disappear while an existing tab remains open.
        }
        return true;
    }

    async function applyHash(field) {
        const state = fieldState.get(field);
        if (!state) return false;
        if (state.isHashed) return true;
        if (state.hashPromise) return state.hashPromise;

        const operation = performHash(field, state);
        state.hashPromise = operation;
        try {
            return await operation;
        } finally {
            if (fieldState.get(field) === state) {
                state.hashPromise = null;
            }
        }
    }

    function showGenerationError() {
        alert('PwdHash could not generate the password. Please try again.');
    }

    // Handle input events after hashing to prevent reverting to master password
    function handlePostHashInput(field, isTrusted) {
        const state = fieldState.get(field);
        if (!state || !state.isHashed || !state.hashedPassword) return;
        if (field.value === state.hashedPassword) return;

        if (isTrusted) {
            // The user is editing the field themselves. This happens after a failed login attempt
            // when the site leaves the generated password in place: retyping must work, so hand the
            // field back to the page exactly as a page reload would. Typing "@@" re-arms PwdHash.
            deactivatePwdHash(field, state);
            return;
        }

        // A page script changed the value (e.g. a show/hide toggle re-rendering the input).
        // Restore the generated password so the site never sees the master password.
        field.value = state.hashedPassword;
    }

    // Use event delegation on the document to catch all relevant events.
    document.addEventListener('input', (event) => {
        const field = eventTarget(event);
        if (field === fieldBeingFilled) return;
        if (!PwdHashUtils.isPasswordField(field)) return;

        if (field.value.startsWith('@@')) {
            // A field that already holds a generated password has to be reset first, otherwise the
            // stale state would treat the new master password as already hashed.
            const state = fieldState.get(field);
            if (state && state.isHashed) {
                deactivatePwdHash(field, state);
            }
            activatePwdHash(field);
        } else {
            // Check if this field has been hashed
            handlePostHashInput(field, event.isTrusted);
        }
    }, true);

    // Substitute placeholders as characters arrive. beforeinput is the modern keypress: it fires
    // before the field changes, it can be cancelled, and it says what is about to be inserted.
    document.addEventListener('beforeinput', (event) => {
        const field = eventTarget(event);
        if (!isMasking(field)) return;

        let text = null;
        if (event.inputType === 'insertText') {
            text = event.data;
        } else if (event.inputType === 'insertFromPaste' && event.dataTransfer) {
            text = event.dataTransfer.getData('text');
        }
        if (!text) return;

        // Deletions, composition and everything else are left alone: the placeholders already in
        // the field survive being edited, because the map is keyed on the character itself.
        const start = field.selectionStart;
        const end = field.selectionEnd;
        if (start === null || start === undefined) return;

        const state = fieldState.get(field);
        const masked = maskText(state, text);
        event.preventDefault();
        fieldBeingFilled = field;
        try {
            field.setRangeText(masked, start, end, 'end');
            field.dispatchEvent(new Event('input', { bubbles: true }));
        } finally {
            fieldBeingFilled = null;
        }
    }, true);

    // A keystroke carries the character as well, so the page must not see the printable ones
    // either. Enter, Tab and the rest are named keys and still get through.
    ['keydown', 'keypress', 'keyup'].forEach((type) => {
        document.addEventListener(type, (event) => {
            if (event.key && event.key.length === 1 && isMasking(eventTarget(event))) {
                event.stopPropagation();
            }
        }, true);
    });

    // Same for the clipboard: a paste listener on the page would otherwise read it directly.
    document.addEventListener('paste', (event) => {
        if (isMasking(eventTarget(event))) event.stopPropagation();
    }, true);

    // Hash on Enter key press BEFORE the form submission happens
    document.addEventListener('keydown', async (event) => {
        const target = eventTarget(event);
        if (event.key === 'Enter' && PwdHashUtils.isPasswordField(target)) {
            const field = target;
            if (fieldState.has(field) && !fieldState.get(field).isHashed) {
                // Prevent form submission while we hash
                event.preventDefault();
                event.stopImmediatePropagation();

                if (!await applyHash(field)) {
                    showGenerationError();
                    return;
                }

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
        const field = eventTarget(event);
        if (PwdHashUtils.isPasswordField(field)) {
            void applyHash(field).then((success) => {
                if (!success && fieldState.has(field)) showGenerationError();
            });
        }
    }, true);

    // Intercept clicks on submit buttons to hash password before Chrome captures it
    document.addEventListener('click', async (event) => {
        if (event.__pwdhash_processed) return;

        const target = eventTarget(event);
        if (!(target instanceof Element)) return;

        const submitter = target.closest('button[type="submit"], input[type="submit"]');

        if (submitter) {
            // Find the form
            const form = submitter.form || submitter.closest('form');
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
                    if (!await applyHash(field)) {
                        showGenerationError();
                        return;
                    }
                }

                // Now actually click the button
                // Create a new click event
                const newEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });

                // Mark it to avoid infinite loop
                Object.defineProperty(newEvent, '__pwdhash_processed', { value: true });
                submitter.dispatchEvent(newEvent);
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

            // Hash all password fields (this will populate the hidden fields)
            for (const field of passwordFields) {
                if (!await applyHash(field)) {
                    showGenerationError();
                    return;
                }
            }

            // Submit again now the fields hold generated passwords. requestSubmit fires a fresh
            // submit event, so the page's own handler runs - a single-page app would otherwise
            // never hear about the login, because HTMLFormElement.submit() skips every listener
            // and navigates. Second time round there is nothing left to hash, so this listener
            // stands aside.
            form.requestSubmit(event.submitter || undefined);
        }
    }, true);

})();
