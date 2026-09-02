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

    /**
     * Generates a legacy password using the original Stanford PwdHash HMAC-MD5 algorithm.
     * @param {string} masterPassword - The user's master password.
     * @param {string} domain - The domain name to use as a salt.
     * @returns {string} The generated legacy password.
     */
    function generateLegacyPassword(masterPassword, domain) {
        const hash = b64_hmac_md5(masterPassword, domain);
        const size = masterPassword.length + 2; // "@@" prefix length
        const nonalphanumeric = /\W/.test(masterPassword);
        return applyConstraints(hash, size, nonalphanumeric);
    }

    function applyConstraints(hash, size, nonalphanumeric) {
        const startingSize = size - 4;
        let result = hash.substring(0, startingSize);
        const extras = hash.substring(startingSize).split('');

        const nextExtra = () => extras.length ? extras.shift().charCodeAt(0) : 0;
        const nextExtraChar = () => String.fromCharCode(nextExtra());
        const rotate = (arr, amount) => { while(amount--) arr.push(arr.shift()); };
        const between = (min, interval, offset) => min + offset % interval;
        const nextBetween = (base, interval) => String.fromCharCode(between(base.charCodeAt(0), interval, nextExtra()));
        const contains = (regex) => result.match(regex);

        result += (contains(/[A-Z]/) ? nextExtraChar() : nextBetween('A', 26));
        result += (contains(/[a-z]/) ? nextExtraChar() : nextBetween('a', 26));
        result += (contains(/[0-9]/) ? nextExtraChar() : nextBetween('0', 10));
        result += (contains(/\W/) && nonalphanumeric ? nextExtraChar() : '+');
        while (contains(/\W/) && !nonalphanumeric) {
            result = result.replace(/\W/, nextBetween('A', 26));
        }

        result = result.split('');
        rotate(result, nextExtra());
        return result.join('');
    }

    // MD5 Implementation (required for legacy mode)
    // The original PwdHash uses b64pad = "" (md5.js:15). Padding the base64 output changes every
    // legacy password whose master password is 22 characters or longer, because the pad character
    // then falls inside the part of the hash that applyConstraints actually uses.
    const B64_PAD = "";

    function b64_hmac_md5(key, data) {
        let bkey = str2binb(key);
        if(bkey.length > 16) bkey = core_md5(bkey, key.length * 8);
        const ipad = Array(16), opad = Array(16);
        for(let i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        const hash = core_md5(ipad.concat(str2binb(data)), 512 + data.length * 8);
        return binb2b64(core_md5(opad.concat(hash), 512 + 128));
    }

    function core_md5(x, len) {
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;
        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
        for(let i = 0; i < x.length; i += 16) {
            const olda = a, oldb = b, oldc = c, oldd = d;
            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);
            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);
            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);
            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);
            a = safe_add(a, olda); b = safe_add(b, oldb);
            c = safe_add(c, oldc); d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    }

    function md5_cmn(q, a, b, x, s, t) { return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b); }
    function md5_ff(a, b, c, d, x, s, t) { return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function md5_gg(a, b, c, d, x, s, t) { return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function md5_hh(a, b, c, d, x, s, t) { return md5_cmn(b ^ c ^ d, a, b, x, s, t); }
    function md5_ii(a, b, c, d, x, s, t) { return md5_cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function safe_add(x, y) { const lsw = (x & 0xFFFF) + (y & 0xFFFF); const msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xFFFF); }
    function bit_rol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function str2binb(str) { const bin = []; const mask = (1 << 8) - 1; for(let i = 0; i < str.length * 8; i += 8) bin[i>>5] |= (str.charCodeAt(i / 8) & mask) << (i%32); return bin; }
    function binb2b64(binarray) {
        const tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let str = "";
        for(let i = 0; i < binarray.length * 4; i += 3) {
            const triplet = (((binarray[i >> 2] >> 8 * ( i %4)) & 0xFF) << 16)
                        | (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 )
                        |  ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
            for(let j = 0; j < 4; j++) {
                if(i * 8 + j * 6 > binarray.length * 32) str += B64_PAD;
                else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
            }
        }
        return str;
    }

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
                hashPromise: null
            });
            hiddenSubmitFields.set(field, hiddenField);

            field.style.backgroundColor = PWDHASH_ACTIVE_COLOR;
        }
        field.value = field.value.substring(2);
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

        const masterPassword = field.value;

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
                ? generateLegacyPassword(masterPassword, domain)
                : await generateSecurePassword(masterPassword, domain);
        } catch (_) {
            return false;
        }
        if (!hashedPassword) return false;

        // Set the generated password in both fields. Only the hidden field retains a name, so the
        // page receives the generated password without ever receiving the master password.
        state.isHashed = true;
        state.hashedPassword = hashedPassword;
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
        const field = event.target;
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

    // Hash on Enter key press BEFORE the form submission happens
    document.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && PwdHashUtils.isPasswordField(event.target)) {
            const field = event.target;
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
        if (PwdHashUtils.isPasswordField(event.target)) {
            void applyHash(event.target).then((success) => {
                if (!success && fieldState.has(event.target)) showGenerationError();
            });
        }
    }, true);

    // Intercept clicks on submit buttons to hash password before Chrome captures it
    document.addEventListener('click', async (event) => {
        if (event.__pwdhash_processed) return;

        const target = event.target;
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
