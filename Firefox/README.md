# PwdHash - Firefox Add-on

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Mozilla Add-on](https://img.shields.io/badge/Mozilla%20Add--on-Coming%20Soon-blue.svg)]()
[![Technology](https://img.shields.io/badge/Technology-WebExtensions%20%26%20MV3-orange.svg)]()

This is the Firefox Add-on component of the multi-platform PwdHash project. It provides a seamless way to generate strong, per-site passwords directly within your browser.

For a full overview of the project's philosophy and shared cryptographic model, please see the [**main project README](../README.md)**.

## Features

*   **Secure Per-Site Passwords:** Generates unique passwords for every website using a single master password.
*   **Modern Cryptography:** Uses the industry-standard **PBKDF2 with SHA-256** to create strong, unrecoverable hashes.
*   **Effortless Trigger:** Simply type `@@` at the beginning of your password in any password field to activate.
*   **Zero Storage:** Your master password is never stored or transmitted. It only exists in memory for a fraction of a second.
*   **Cross-Platform Compatible:** Generates the exact same passwords as the companion Website and Android app.

## Screenshot

![Extension in action](src/assets/screenshot.png)
*(A screenshot of the add-on should be placed in a `src/assets` folder within this directory.)*

## Installation

#### From the Mozilla Add-on Store (Recommended)
*(Coming Soon)*

#### From Source (For Developers)
1.  Clone the main PwdHash repository from the root:
    ```bash
    git clone https://github.com/FireBurn/PwdHash.git
    ```
2.  Open Mozilla Firefox and navigate to `about:debugging`.
3.  Click on **"This Firefox"** in the left-hand menu.
4.  Click the **"Load Temporary Add-on..."** button.
5.  In the file dialog, navigate into the cloned repository, into the `Firefox/` directory, and select the `src/manifest.json` file. The add-on will now be installed temporarily.

## License

This project is licensed under the BSD 3-Clause License. See the main [LICENSE](../LICENSE) file for full details.
