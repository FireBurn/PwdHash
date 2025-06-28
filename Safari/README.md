# PwdHash - Safari Web Extension

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Apple App Store](https://img.shields.io/badge/Apple%20App%20Store-Coming%20Soon-blue.svg)]()
[![Technology](https://img.shields.io/badge/Technology-Safari%20Web%20Extension-orange.svg)]()

This is the Safari Web Extension component of the multi-platform PwdHash project. It provides a seamless way to generate strong, per-site passwords directly within your browser on macOS.

For a full overview of the project's philosophy and shared cryptographic model, please see the [**main project README](../README.md)**.

## Features

*   **Secure Per-Site Passwords:** Generates unique passwords for every website using a single master password.
*   **Modern Cryptography:** Uses the industry-standard **PBKDF2 with SHA-256** to create strong, unrecoverable hashes.
*   **Seamless Activation:** Simply type `@@` at the end of a password field to enter "PwdHash mode". The field will change color, ready for your master password.
*   **Zero Storage:** Your master password is never stored or transmitted. It only exists in memory for a fraction of a second.
*   **Cross-Platform Compatible:** Generates the exact same passwords as the companion Website, Android app, and other browser extensions.

## Screenshot

![Extension in action](PwdHash/assets/screenshot.png)
*(A screenshot should be placed in the `PwdHash/assets` folder within this directory.)*

## Installation (For Developers)

Safari Web Extensions are not installed from a folder like in Chrome or Firefox. They must be built and run through Xcode, which wraps the extension in a lightweight macOS application.

**Prerequisites:**
*   macOS
*   Xcode (available from the Mac App Store) and its Command Line Tools.

**Steps:**
1.  Clone the main PwdHash repository:
    ```bash
    git clone https://github.com/FireBurn/PwdHash.git
    ```
2.  Open the **Terminal** app.
3.  Navigate into the `Safari` directory of the cloned repository:
    ```bash
    cd PwdHash/Safari
    ```
4.  Run the `safari-web-extension-converter` tool. This command tells it to convert the source files located in the `PwdHash` subdirectory:
    ```bash
    xcrun safari-web-extension-converter PwdHash
    ```
5.  Xcode will launch and ask where to save the new project. Save it anywhere you like.
6.  Once the project is open in Xcode, simply click the **"Run"** button (it looks like a play icon ▶) in the top-left corner.
7.  Xcode will build the wrapper app. A "P" icon for PwdHash might appear in your Dock. You can ignore or quit this app; the extension itself is now installed.
8.  Open Safari, go to **Settings... > Extensions**, and check the box next to **"PwdHash"** to enable it. You will be asked to grant it permission to access web pages.

The extension is now active and will work until you quit Safari. To run it again, just repeat step 6.

## License

This project is licensed under the BSD 3-Clause License. See the main [LICENSE](../LICENSE) file for full details.
