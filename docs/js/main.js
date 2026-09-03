/**
 * PwdHash Web Controller
 * Handles Modern (PBKDF2) and Legacy (MD5) generation.
 */

document.addEventListener("DOMContentLoaded", () => {
    const RESULT_LIFETIME_MS = 60_000;
    const domainInput = document.getElementById("domain");
    const passwordInput = document.getElementById("password");
    const generateBtn = document.getElementById("generate-btn");
    const resultsArea = document.getElementById("results-area");
    const resultModern = document.getElementById("result-modern");
    const resultLegacy = document.getElementById("result-legacy");
    const effectiveDomainLabel = document.getElementById("effective-domain");
    const copyButtons = Array.from(document.querySelectorAll(".copy-btn"));
    let inputRevision = 0;
    let isGenerating = false;
    let resultClearTimer;

    function clearResults() {
        inputRevision += 1;
        clearTimeout(resultClearTimer);
        resultModern.value = "";
        resultLegacy.value = "";
        resultsArea.classList.add("is-disabled");
        copyButtons.forEach(button => { button.disabled = true; });
    }

    // The pinned public suffix list only matters to modern mode, and only once someone generates,
    // so let it load in the background rather than holding up the page.
    const publicSuffixRules = PwdHashDomains.loadPublicSuffixRules("data/public-suffix-list.txt")
        .catch(() => null);

    /**
     * The two modes salt with different domains on purpose: legacy has to reproduce the original
     * PwdHash rule, modern uses the public suffix list. Show whichever applies, and both when
     * they disagree, so nobody has to guess which password belongs to which site.
     */
    function effectiveDomains(raw) {
        let legacy = "";
        let modern = "";
        try {
            legacy = PwdHashDomains.extractLegacyDomain(raw);
        } catch (_) {
            legacy = "";
        }
        try {
            modern = PwdHashDomains.extractModernDomain(PwdHashDomains.hostFromInput(raw));
        } catch (_) {
            modern = ""; // The list has not finished loading yet.
        }
        return { legacy, modern };
    }

    function describeDomains({ legacy, modern }) {
        if (!legacy && !modern) return "Invalid domain format";
        if (!modern) return `Hashing for: ${legacy}`;
        if (!legacy || legacy === modern) return `Hashing for: ${modern}`;
        return `Hashing for: ${modern} (legacy: ${legacy})`;
    }

    // Live update of the extracted domain
    async function refreshEffectiveDomain() {
        const raw = domainInput.value.trim();
        if (!raw) {
            effectiveDomainLabel.textContent = "\u00A0"; // nbsp
            return;
        }
        await publicSuffixRules;
        effectiveDomainLabel.textContent = describeDomains(effectiveDomains(raw));
    }

    domainInput.addEventListener("input", () => {
        clearResults();
        void refreshEffectiveDomain();
    });
    passwordInput.addEventListener("input", clearResults);

    // Generate on button click or Enter key in either field
    generateBtn.addEventListener("click", performGeneration);
    domainInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void performGeneration();
        }
    });
    passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void performGeneration();
        }
    });

    // Copy buttons
    copyButtons.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const targetId = e.currentTarget.getAttribute("data-target");
            const input = document.getElementById(targetId);
            if (input && input.value) {
                try {
                    await copyText(input.value);
                    showToast();
                    input.select();
                } catch (_) {
                    alert("Could not copy the password. Please select and copy it manually.");
                }
            }
        });
    });

    async function performGeneration() {
        if (isGenerating) return;

        const rawDomain = domainInput.value.trim();
        let masterPassword = passwordInput.value;

        if (!rawDomain || !masterPassword) {
            alert("Please enter both a site address and a master password.");
            return;
        }

        await publicSuffixRules;
        const { legacy: legacyDomain, modern: modernDomain } = effectiveDomains(rawDomain);
        if (!legacyDomain || !modernDomain) {
            alert("Could not extract a valid domain from the input.");
            return;
        }

        const revision = inputRevision;
        isGenerating = true;
        generateBtn.disabled = true;
        generateBtn.textContent = "Generating…";
        resultsArea.setAttribute("aria-busy", "true");
        passwordInput.value = "";

        try {
            const legacyPwd = PwdHashAlgorithms.generateLegacyPassword(masterPassword, legacyDomain);
            const modernPwd = await PwdHashAlgorithms.generateSecurePassword(
                masterPassword,
                modernDomain
            );

            // Do not reveal a password for stale inputs if the user edited the domain or master
            // password while the asynchronous derivation was running.
            if (revision !== inputRevision) return;

            resultModern.value = modernPwd;
            resultLegacy.value = legacyPwd;
            resultsArea.classList.remove("is-disabled");
            copyButtons.forEach(button => { button.disabled = false; });
            resultClearTimer = setTimeout(clearResults, RESULT_LIFETIME_MS);
        } catch (_) {
            clearResults();
            alert("Could not generate the passwords. Please try again.");
        } finally {
            masterPassword = "";
            isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate Passwords";
            resultsArea.removeAttribute("aria-busy");
        }
    }

    async function copyText(value) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(value);
            return;
        }

        const helper = document.createElement("textarea");
        helper.value = value;
        helper.setAttribute("readonly", "");
        helper.className = "clipboard-helper";
        document.body.appendChild(helper);
        helper.select();
        try {
            if (!document.execCommand("copy")) throw new Error("Copy command failed");
        } finally {
            helper.remove();
        }
    }

    function showToast() {
        const toast = document.getElementById("toast");
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2000);
    }

    window.addEventListener("pagehide", () => {
        passwordInput.value = "";
        clearResults();
    });
});
