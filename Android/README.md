# PwdHash - Android App

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Google Play](https://img.shields.io/badge/Google%20Play-Coming%20Soon-blue.svg)]()
[![Technology](https://img.shields.io/badge/Technology-Kotlin%20%26%20Compose-purple.svg)]()

This is the official Android companion app for the PwdHash project. It allows you to generate your secure, per-site passwords on the go, with the same strong cryptography as the browser extension and website.

For a full overview of the project's philosophy and shared cryptographic model, please see the [**main project README](../README.md)**.

## Features

*   **Secure On-Device Storage:** The master password is encrypted at rest using Android's `EncryptedSharedPreferences` and the Android Keystore system.
*   **Biometric Authentication:** Your fingerprint, face, or device PIN is required before any password can be generated.
*   **Seamless Share Target:** Share a URL from your mobile browser directly to the PwdHash app to generate and copy a password in one motion.
*   **Standalone Generator:** Manually enter a domain to generate a password.
*   **Algorithm Compatibility:** Generates the **exact same passwords** as the PwdHash browser extension and web companion.
*   **Password Management:** Includes a secure settings screen to delete and reset your master password.

## Screenshots

| Setup Screen | Generator Screen |
| :---: | :---: |
| ![_assets/setup_screen.png](_assets/setup_screen.png) | ![_assets/generator_screen.png](_assets/generator_screen.png) |
*(Please place screenshots in an `_assets` folder within this directory.)*

## Installation

#### From the Google Play Store
*(Coming Soon)*

#### From Source (For Developers)
You can build the app from source using Android Studio.

**Prerequisites:**
*   Android Studio (latest stable version recommended)
*   Android SDK

**Steps:**
1.  Clone the main PwdHash repository:
    ```bash
    git clone https://github.com/FireBurn/PwdHash.git
    ```
2.  Open Android Studio.
3.  Choose **"Open an Existing Project"** and select the `Android/` subdirectory from the cloned repository.
4.  Let Gradle sync the project dependencies.
5.  Run the app on an emulator or a physical device.

To build a testable debug version from the command line:
```bash
# Navigate into the Android project directory first
cd Android
./gradlew assembleDebug
