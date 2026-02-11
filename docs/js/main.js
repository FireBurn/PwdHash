/**
 * PwdHash Web Controller
 * Handles Modern (PBKDF2) and Legacy (MD5) generation.
 */

document.addEventListener("DOMContentLoaded", () => {
    const domainInput = document.getElementById("domain");
    const passwordInput = document.getElementById("password");
    const generateBtn = document.getElementById("generate-btn");
    const resultsArea = document.getElementById("results-area");
    const resultModern = document.getElementById("result-modern");
    const resultLegacy = document.getElementById("result-legacy");
    const effectiveDomainLabel = document.getElementById("effective-domain");

    // Live update of the extracted domain
    domainInput.addEventListener("input", () => {
        const raw = domainInput.value.trim();
        if (!raw) {
            effectiveDomainLabel.textContent = "\u00A0"; // nbsp
            return;
        }
        const site = getSite(raw);
        if (site) {
            effectiveDomainLabel.textContent = `Hashing for: ${site}`;
        } else {
            effectiveDomainLabel.textContent = "Invalid domain format";
        }
    });

    // Generate on button click or Enter key in password field
    generateBtn.addEventListener("click", performGeneration);
    passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performGeneration();
    });

    // Copy buttons
    document.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetId = e.target.getAttribute("data-target");
            const input = document.getElementById(targetId);
            if (input && input.value) {
                navigator.clipboard.writeText(input.value).then(() => {
                    showToast();
                });
                input.select();
            }
        });
    });

    async function performGeneration() {
        const rawDomain = domainInput.value.trim();
        const masterPassword = passwordInput.value;

        if (!rawDomain || !masterPassword) {
            alert("Please enter both a site address and a master password.");
            return;
        }

        const domain = getSite(rawDomain);
        if (!domain) {
            alert("Could not extract a valid domain from the input.");
            return;
        }

        // 1. Generate Modern Password (Async)
        try {
            const modernPwd = await generateModernPassword(masterPassword, domain);
            resultModern.value = modernPwd;
        } catch (e) {
            console.error(e);
            resultModern.value = "Error generating password";
        }

        // 2. Generate Legacy Password (Sync)
        try {
            const legacyPwd = generateLegacyPassword(masterPassword, domain);
            resultLegacy.value = legacyPwd;
        } catch (e) {
            console.error(e);
            resultLegacy.value = "Error generating legacy password";
        }

        // Show results
        resultsArea.style.opacity = "1";
        resultsArea.style.pointerEvents = "auto";
    }

    function showToast() {
        const toast = document.getElementById("toast");
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2000);
    }
});

/* =========================================
   Domain Extraction Logic
   ========================================= */
function getSite(url) {
    let host;
    try {
        if (!url.includes("://") && !url.startsWith("//")) {
            url = "http://" + url;
        }
        host = new URL(url).hostname;
    } catch (e) {
        return null;
    }

    if (!host) return null;

    const parts = host.split('.').reverse();
    if (parts.length <= 1) return host;

    const tld = parts[0];
    const sld = parts[1];
    const domain = `${sld}.${tld}`;

    const commonSecondLevels = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);
    
    if (parts.length > 2 && commonSecondLevels.has(sld)) {
        return `${parts[2]}.${domain}`;
    }
    return domain;
}

/* =========================================
   Modern Algorithm: PBKDF2-SHA256
   ========================================= */
async function generateModernPassword(masterPassword, domain) {
    const iter = 300000;
    const keyLenBits = 256;
    
    const enc = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
        "raw", 
        enc.encode(masterPassword), 
        { name: "PBKDF2" }, 
        false, 
        ["deriveBits"]
    );

    const bits = await window.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: enc.encode(domain),
            iterations: iter,
            hash: "SHA-256"
        },
        passwordKey,
        keyLenBits
    );

    const bytes = new Uint8Array(bits);
    
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const symbols = "!@#$%^&*()_-+=";
    const all = lower + upper + digits + symbols;

    const chars = [];
    chars.push(lower[bytes[0] % lower.length]);
    chars.push(upper[bytes[1] % upper.length]);
    chars.push(digits[bytes[2] % digits.length]);
    chars.push(symbols[bytes[3] % symbols.length]);

    for (let i = 4; i < 16; i++) {
        const b = bytes[i % bytes.length];
        chars.push(all[b % all.length]);
    }

    for (let i = chars.length - 1; i > 0; i--) {
        const byteIndex = (16 + i) % bytes.length;
        const j = bytes[byteIndex] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}

/* =========================================
   Legacy Algorithm: HMAC-MD5 (Stanford)
   ========================================= */
function generateLegacyPassword(masterPassword, domain) {
    // This is the exact Stanford PwdHash legacy algorithm
    var hash = b64_hmac_md5(masterPassword, domain);
    var size = masterPassword.length + 2; // "@@" prefix length
    var nonalphanumeric = masterPassword.match(/\W/) != null;
    var result = applyConstraints(hash, size, nonalphanumeric);
    return result;
}

function applyConstraints(hash, size, nonalphanumeric) {
    var startingSize = size - 4;  // Leave room for some extra characters
    var result = hash.substring(0, startingSize);
    var extras = hash.substring(startingSize).split('');

    // Utility functions
    function nextExtra() { return extras.length ? extras.shift().charCodeAt(0) : 0; }
    function nextExtraChar() { return String.fromCharCode(nextExtra()); }
    function rotate(arr, amount) { while(amount--) arr.push(arr.shift()); }
    function between(min, interval, offset) { return min + offset % interval; }
    function nextBetween(base, interval) { 
      return String.fromCharCode(between(base.charCodeAt(0), interval, nextExtra()));
    }
    function contains(regex) { return result.match(regex); }

    // Add the extra characters
    result += (contains(/[A-Z]/) ? nextExtraChar() : nextBetween('A', 26));
    result += (contains(/[a-z]/) ? nextExtraChar() : nextBetween('a', 26));
    result += (contains(/[0-9]/) ? nextExtraChar() : nextBetween('0', 10));
    result += (contains(/\W/) && nonalphanumeric ? nextExtraChar() : '+');
    while (contains(/\W/) && !nonalphanumeric) {
      result = result.replace(/\W/, nextBetween('A', 26));
    }

    // Rotate the result to make it harder to guess the inserted locations
    result = result.split('');
    rotate(result, nextExtra());
    return result.join('');
}

/* --- Verified PajHome HMAC-MD5 Implementation (Standard) --- */
var hexcase = 0;
var b64pad  = "";
var chrsz   = 8;

function b64_hmac_md5(key, data) { return binb2b64(core_hmac_md5(key, data)); }

function core_hmac_md5(key, data) {
  var bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_md5(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++) {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_md5(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_md5(opad.concat(hash), 512 + 128);
}

function core_md5(x, len) {
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16) {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

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
    c = md5_ff(c, d, a, b, x[i+ 10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+ 11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+ 12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+ 13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+ 14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+ 15], 22,  1236535329);

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
    c = md5_hh(c, d, a, b, x[i+ 11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+ 14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+ 10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+ 13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+ 12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+ 15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+ 14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+ 12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+ 10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+ 15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+ 13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+ 11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

function md5_cmn(q, a, b, x, s, t) { return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b); }
function md5_ff(a, b, c, d, x, s, t) { return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t); }
function md5_gg(a, b, c, d, x, s, t) { return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t); }
function md5_hh(a, b, c, d, x, s, t) { return md5_cmn(b ^ c ^ d, a, b, x, s, t); }
function md5_ii(a, b, c, d, x, s, t) { return md5_cmn(c ^ (b | (~d)), a, b, x, s, t); }

function safe_add(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

function bit_rol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }

function str2binb(str) {
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
  return bin;
}

function binb2b64(binarray) {
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3) {
    var triplet = (((binarray[i >> 2] >> 8 * ( i %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++) {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}
