# PwdHash - iOS App

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Apple App Store](https://img.shields.io/badge/Apple%20App%20Store-Coming%20Soon-blue.svg)]()
[![Technology](https://img.shields.io/badge/Technology-Swift%20%26%20SwiftUI-purple.svg)]()

This is the official iOS companion app for the PwdHash project. It allows you to generate your secure, per-site passwords on the go, with the same strong cryptography as the browser extensions and website.

For a full overview of the project's philosophy and shared cryptographic model, please see the [**main project README](../README.md)**.

## Features

*   **Secure On-Device Storage:** The master password is encrypted and stored in the secure iOS Keychain.
*   **Biometric Authentication:** Face ID, Touch ID, or your device passcode is required before any password can be generated.
*   **Seamless Share Extension:** Share a URL from Safari directly to the PwdHash extension to generate and copy a password in one motion.
*   **Standalone Generator:** Manually enter a domain to generate a password within the main app.
*   **Algorithm Compatibility:** Generates the **exact same passwords** as the PwdHash browser extensions and web companion.
*   **Password Management:** Includes a secure settings screen to delete and reset your master password.

## Screenshots

| Setup Screen | Generator Screen |
| :---: | :---: |
| _assets/setup_screen.png | _assets/generator_screen.png |
*(Please place screenshots in an `_assets` folder within this directory.)*

## Installation & Building (For Developers)

**Prerequisites:**
*   macOS with the latest version of Xcode installed.
*   A basic understanding of Swift and SwiftUI.

**Steps:**
1.  Clone the main PwdHash repository:
    ```bash
    git clone https://github.com/FireBurn/PwdHash.git
    ```
2.  Navigate to the `iOS/` subdirectory and open the `PwdHash.xcodeproj` file in Xcode.
3.  Select a simulator (e.g., "iPhone 15 Pro") or a connected physical device from the scheme menu at the top of the Xcode window.
4.  Click the **"Run"** button (it looks like a play icon ▶) to build and install the app.

**Running the Share Extension:**
1.  With the main app already built, edit the scheme by clicking on the project name next to the device selector and choosing **"Edit Scheme..."**.
2.  In the left pane, select **"Run"**.
3.  For the "Executable" dropdown, choose the **"PwdHashShare"** target.
4.  When prompted for an app to run, choose **Safari**.
5.  Click **"Run"**. This will launch Safari. Navigate to any webpage, tap the "Share" icon, find "PwdHash" in the list of activities (you may need to tap "Edit Actions..." to enable it first), and tap it to use the extension.
