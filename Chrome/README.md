# PwdHash - Chrome Extension

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v3.1.0-brightgreen.svg)](https://chrome.google.com/webstore/detail/pwdhash-unofficial-port/bpciigjflolfjofkpaellplmgmiadkma)
[![Technology](https://img.shields.io/badge/Technology-Manifest%20V3-orange.svg)]()

This is the Chrome Extension component of the multi-platform PwdHash project. It provides a seamless way to generate strong, per-site passwords directly within your browser.

For a full overview of the project's philosophy and shared cryptographic model, please see the [**main project README](../README.md)**.

## Features

*   **Secure Per-Site Passwords:** Generates unique passwords for every website using a single master password.
*   **Modern Cryptography:** Uses the industry-standard **PBKDF2 with SHA-256** to create strong, unrecoverable hashes.
*   **Effortless Trigger:** Simply type `@@` at the beginning of your password in any password field to activate.
*   **Zero Storage:** Your master password is never stored or transmitted. It only exists in memory for a fraction of a second.
*   **Cross-Platform Compatible:** Generates the exact same passwords as the companion Website and Android app.

## Screenshot

![Extension in action](_assets/screenshot.png)
*(Please place a screenshot of the extension in an `_assets` folder within this directory.)*

## Installation

#### From the Chrome Web Store (Recommended)
You can install the official version of this extension from the Chrome Web Store for automatic updates and security.

[**Install PwdHash from the Chrome Web Store**](https://chrome.google.com/webstore/detail/pwdhash-unofficial-port/bpciigjflolfjofkpaellplmgmiadkma)

#### From Source (For Developers)
1.  Clone the main PwdHash repository from the root:
    ```bash
    git clone https://github.com/FireBurn/PwdHash.git
    ```
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle in the top-right corner.
4.  Click the **"Load unpacked"** button.
5.  In the file dialog, navigate into the cloned repository and select the `Chrome/` subdirectory. The extension will now be installed locally.

## License

This project is licensed under the BSD 3-Clause License. See the main [LICENSE](../LICENSE) file for full details.
