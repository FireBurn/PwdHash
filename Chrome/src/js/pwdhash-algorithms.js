/**
 * @file The two password algorithms, shared by the extension and the website.
 *
 * Modern is PBKDF2-SHA256, new to this project. Legacy is the original PwdHash's HMAC-MD5 and
 * must stay bug-for-bug identical to it, right down to the unpadded base64 - tests/original/
 * holds the real thing and the test suite compares against it.
 *
 * Keep this file byte-identical with docs/js/pwdhash-algorithms.js; a test enforces it. The
 * Android app carries a port of the same two functions, held to the same vectors.
 */
var PwdHashAlgorithms = (function () {
    'use strict';

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

    return {
        generateSecurePassword: generateSecurePassword,
        generateLegacyPassword: generateLegacyPassword
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PwdHashAlgorithms;
