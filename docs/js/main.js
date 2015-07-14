/**
 * @file Main JavaScript for the PwdHash companion website.
 * @description Implements the same secure PBKDF2 hashing algorithm as the browser extension.
 */
document.addEventListener('DOMContentLoaded', () => {

    const domainInput = document.getElementById('domainInput');
    const effectiveDomainInput = document.getElementById('effectiveDomain'); // New field
    const passwordInput = document.getElementById('password');
    const generateBtn = document.getElementById('generateBtn');
    const resultInput = document.getElementById('hashedPassword');
    const copyBtn = document.getElementById('copyBtn');
    const copyMessage = document.getElementById('copyMessage');

    /**
     * Extracts a registrable domain from a URL.
     * This is a direct port of the logic from the browser extension and Android app.
     */
    function getSite(url) {
        let host;
        try {
            host = new URL(url).hostname;
        } catch (e) {
            // Not a valid URL, check if it's a domain-like string
            if (url.includes('.') && !url.includes(' ') && !url.includes('/')) {
                host = url;
            } else {
                return null;
            }
        }

        const parts = host.split('.').reverse();
        if (parts.length <= 1) return host;

        const domain = `${parts[1]}.${parts[0]}`;
        const commonSecondLevels = new Set(["co", "com", "org", "net", "gov", "edu"]);

        if (parts.length > 2 && commonSecondLevels.has(parts[1])) {
            return `${parts[2]}.${domain}`;
        }
        return domain;
    }

    /**
     * Generates a secure, deterministic, site-specific password using modern web standards.
     * This is the same core function used by the browser extension.
     */
    async function generateSecurePassword(masterPassword, domain) {
        const length = 16;
        const iterations = 300000;

        const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
        const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const DIGIT_CHARS = '0123456789';
        const SYMBOL_CHARS = '!@#$%^&*()_-+=';
        const ALL_CHARS = LOWERCASE_CHARS + UPPERCASE_CHARS + DIGIT_CHARS + SYMBOL_CHARS;

        const salt = new TextEncoder().encode(domain);
        const keyMaterial = await crypto.subtle.importKey(
            "raw", new TextEncoder().encode(masterPassword), { name: "PBKDF2" },
            false, ["deriveBits"]
        );
        const derivedBits = await crypto.subtle.deriveBits({
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256",
        }, keyMaterial, 256);

        const keyBytes = new Uint8Array(derivedBits);
        let passwordChars = [];
        passwordChars.push(LOWERCASE_CHARS[keyBytes[0] % LOWERCASE_CHARS.length]);
        passwordChars.push(UPPERCASE_CHARS[keyBytes[1] % UPPERCASE_CHARS.length]);
        passwordChars.push(DIGIT_CHARS[keyBytes[2] % DIGIT_CHARS.length]);
        passwordChars.push(SYMBOL_CHARS[keyBytes[3] % SYMBOL_CHARS.length]);

        for (let i = 4; i < length; i++) {
            const byteIndex = i % keyBytes.length;
            passwordChars.push(ALL_CHARS[keyBytes[byteIndex] % ALL_CHARS.length]);
        }

        for (let i = passwordChars.length - 1; i > 0; i--) {
            const byteIndex = (length + i) % keyBytes.length;
            const j = keyBytes[byteIndex] % (i + 1);
            [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
        }
        return passwordChars.join('');
    }

    function updateEffectiveDomain() {
        const rawInput = domainInput.value.trim();
        if (!rawInput) {
            effectiveDomainInput.value = "";
            effectiveDomainInput.classList.remove('warning');
            return;
        }
        const effectiveDomain = getSite(rawInput);
        if (effectiveDomain) {
            effectiveDomainInput.value = effectiveDomain;
            effectiveDomainInput.classList.remove('warning');
        } else {
            effectiveDomainInput.value = "Invalid Input";
            effectiveDomainInput.classList.add('warning');
        }
    }

    async function handleGenerate() {
        const password = passwordInput.value;
        const effectiveDomain = getSite(domainInput.value.trim()); // Use the extracted domain

        if (!effectiveDomain || !password) {
            resultInput.value = "Please fill out all fields.";
            resultInput.classList.add('warning');
            copyBtn.style.display = 'none';
            return;
        }

        generateBtn.disabled = true;
        resultInput.value = "Generating...";
        resultInput.classList.remove('warning');
        copyMessage.textContent = '';

        try {
            // Pass the *effective domain* to the hashing function
            const hashedPassword = await generateSecurePassword(password, effectiveDomain);
            resultInput.value = hashedPassword;
            copyBtn.style.display = 'inline-block';
        } catch (error) {
            console.error("Password generation failed:", error);
            resultInput.value = "Error during generation.";
            resultInput.classList.add('warning');
        } finally {
            generateBtn.disabled = false;
        }
    }

    generateBtn.addEventListener('click', handleGenerate);
    domainInput.addEventListener('input', updateEffectiveDomain);
    passwordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleGenerate();
        }
    });

    copyBtn.addEventListener('click', () => {
        resultInput.select();
        navigator.clipboard.writeText(resultInput.value).then(() => {
            copyMessage.textContent = 'Copied!';
            setTimeout(() => { copyMessage.textContent = ''; }, 2000);
        });
    });

    // Initialize the effective domain field on page load
    updateEffectiveDomain();
});
