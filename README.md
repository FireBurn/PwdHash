# PwdHash - A Modern, Multi-Platform Password Generation System

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](./LICENSE)
[![Platforms](https://img.shields.io/badge/Platform-Chrome%20%7C%20Firefox%20%7C%20Safari%20%7C%20Android%20%7C%20iOS%20%7C%20Web-brightgreen.svg)]()
[![Cryptography](https://img.shields.io/badge/Crypto-PBKDF2%20%26%20SHA--256-orange.svg)]()

This repository contains a complete, multi-platform implementation of PwdHash, a stateless password manager that generates strong, per-site passwords from a single master password. This project is a modernization of the original Stanford PwdHash concept, updated with modern, secure cryptography and a consistent user experience across all platforms.

The core principle is simple: **your master password is the key. It is never stored, saved, or transmitted.** It only exists in memory for the moment of calculation.

## The PwdHash Ecosystem

This repository contains six distinct but fully compatible projects. Each sub-project has its own detailed README.

| Platform | Description | Details |
| :--- | :--- | :--- |
| **Chrome Extension** | A browser extension that lets you generate passwords directly in password fields by typing `@@`. | [**Go to Chrome README**](./Chrome/README.md) |
| **Firefox Add-on** | A browser extension that lets you generate passwords directly in password fields by typing `@@`. | [**Go to Firefox README**](./FireFox/README.md) |
| **Safari Extension** | A web extension for macOS that lets you generate passwords directly in password fields by typing `@@`. | [**Go to Safari README**](./Safari/README.md) |
| **Android App** | A mobile app for generating passwords on-the-go, with a share target for seamless integration. | [**Go to Android README**](./Android/README.md) |
| **iOS App** | A mobile app for generating passwords on-the-go, with a share extension for seamless integration. | [**Go to iOS README**](./iOS/README.md) |
| **Website** | A static, client-side web page for generating passwords from any browser without installation. | [**Go to Website README**](./docs/README.md) |

---

## How It Works: The Core Algorithm

All six platforms generate **identical passwords** for the same inputs by using a consistent, modern, and secure cryptographic algorithm:

1.  **Domain Extraction (The "Salt"):** The system first extracts the unique "registrable domain" from the website you're on (e.g., `google.com`, `bbc.co.uk`). This becomes the unique salt for each password, ensuring `mail.google.com` and `accounts.google.com` produce the same hash.

2.  **Key Derivation (The "Engine"):** Your master password and the domain salt are fed into the industry-standard **PBKDF2** algorithm. This function is run for **300,000 rounds** using **SHA-256** as its core hash function. This is a deliberately slow and memory-intensive process that makes brute-force attacks infeasible. It produces a secure 256-bit (32-byte) cryptographic key that is unique to you and that specific site.

3.  **Password Generation (The "Output"):** The derived key is used as a source of deterministic randomness to build a strong, 16-character password. The algorithm guarantees that every password contains:
    *   At least one uppercase letter (`A-Z`)
    *   At least one lowercase letter (`a-z`)
    *   At least one digit (`0-9`)
    *   At least one special symbol (`!@#$%^&*()_-+=`)

4.  **Shuffling:** Finally, the characters in the generated password are deterministically shuffled based on the derived key. This ensures the required characters don't always appear in predictable positions (e.g., at the start of the password).

---

## Security & Philosophy

PwdHash is not a traditional password manager that stores your passwords in an encrypted vault. Instead, it is a **stateless password generator**.

*   **You only have to remember one password:** your master password.
*   **A breach on one site is isolated:** Since every site gets a unique password, a credential leak on one site does not affect your accounts on any other site.
*   **Nothing to steal:** There is no vault of encrypted passwords to be stolen from your device or a central server. The system only stores your (optional) configuration settings and, on mobile, your encrypted master password protected by the system Keystore or Keychain.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests. When contributing, please ensure your changes are directed at the appropriate sub-project (`Chrome`, `FireFox`, `Safari`, `Android`, `iOS` or `Website`).

## License

This project is licensed under the **BSD 3-Clause License**. See the [LICENSE](./LICENSE) file for full details.
