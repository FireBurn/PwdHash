const PasswordGenerator = {
    getSite(url) {
        let host;
        try {
            let fullUrl = url.includes('://') ? url : `https://${url}`;
            host = new URL(fullUrl).hostname;
        } catch (e) {
            if (url.includes('.') && !url.includes('/') && !url.includes(' ')) {
                host = url;
            } else {
                return null;
            }
        }
        if (!host) return null;

        const parts = host.split('.').reverse();
        if (parts.length <= 1) {
            return host;
        }

        const domain = `${parts[1]}.${parts[0]}`;
        const commonSecondLevels = new Set(["co", "com", "org", "net", "gov", "edu"]);

        if (parts.length > 2 && commonSecondLevels.has(parts[1])) {
            return `${parts[2]}.${domain}`;
        } else {
            return domain;
        }
    },

    async generateSecurePassword(masterPassword, domain) {
        const length = 16;
        const iterations = 300000;
        const keyLength = 256;

        const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
        const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const digitChars = "0123456789";
        const symbolChars = "!@#$%^&*()_-+=";
        const allChars = lowercaseChars + uppercaseChars + digitChars + symbolChars;

        const encoder = new TextEncoder();
        const masterKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(masterPassword),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: encoder.encode(domain),
                iterations: iterations,
                hash: 'SHA-256'
            },
            masterKey,
            keyLength
        );

        const keyBytes = new Uint8Array(derivedBits);

        const passwordChars = [];
        passwordChars.push(lowercaseChars[keyBytes[0] % lowercaseChars.length]);
        passwordChars.push(uppercaseChars[keyBytes[1] % uppercaseChars.length]);
        passwordChars.push(digitChars[keyBytes[2] % digitChars.length]);
        passwordChars.push(symbolChars[keyBytes[3] % symbolChars.length]);

        for (let i = 4; i < length; i++) {
            const byteIndex = i % keyBytes.length;
            passwordChars.push(allChars[keyBytes[byteIndex] % allChars.length]);
        }

        for (let i = passwordChars.length - 1; i >= 0; i--) {
            const byteIndex = (length + i) % keyBytes.length;
            const j = keyBytes[byteIndex] % (i + 1);
            [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
        }

        return passwordChars.join('');
    }
};
