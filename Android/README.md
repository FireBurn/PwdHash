# PwdHash - Android App

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Google Play](https://img.shields.io/badge/Google%20Play-Coming%20Soon-blue.svg)]()
[![Technology](https://img.shields.io/badge/Technology-Kotlin%20%26%20Jetpack%20Compose-purple.svg)]()

This is the official Android companion app for the PwdHash project. It allows you to generate your
secure, per-site passwords on the go, with the same strong cryptography as the browser extension and
website.

The app features a **modern Material 3 design** with color-coded security indicators, making it
immediately clear which passwords are most secure.

For a full overview of the project's philosophy and shared cryptographic model, please see the [*
*main project README**](../README.md).

## Features

* 🎨 **Modern Material 3 UI:** Beautiful card-based interface with color-coded security levels
* 🔒 **Visual Security Indicators:** Green-bordered cards with "SECURE" badges for modern passwords
* 💾 **Secure On-Device Storage:** The master password is encrypted at rest using Android's
  `EncryptedSharedPreferences` and the Android Keystore system
* 👆 **Biometric Authentication:** Your fingerprint, face, or device PIN is required before any
  password can be generated
* 📤 **Seamless Share Target:** Share a URL from your mobile browser directly to the PwdHash app to
  generate and copy a password in one motion
* 📱 **Standalone Generator:** Manually enter a domain to generate a password
* 🔄 **Algorithm Compatibility:** Generates the **exact same passwords** as the PwdHash browser
  extension and web companion
* ⚙️ **Password Management:** Includes a secure settings screen to delete and reset your master
  password

## User Interface

The app uses a card-based design with clear visual hierarchy:

- **Modern Password Card**: Green left border with "SECURE" badge - uses PBKDF2-SHA256 (300k
  iterations)
- **Legacy Password Card**: Orange left border with "OLD SITE" badge - for compatibility with older
  accounts
- **Blue Primary Color**: Consistent with web and Chrome extension (#2563EB)
- **One-Tap Copy**: Copy buttons integrated into each password card

## Screenshots

|                     Setup Screen                      |                       Generator Screen                        |
|:-----------------------------------------------------:|:-------------------------------------------------------------:|
| ![_assets/setup_screen.png](_assets/setup_screen.png) | ![_assets/generator_screen.png](_assets/generator_screen.png) |

*(Please place screenshots in an `_assets` folder within this directory.)*

## Installation

#### From the Google Play Store

*(Coming Soon)*

#### From Source (For Developers)

You can build the app from source using Android Studio.

**Prerequisites:**

* Android Studio (latest stable version recommended)
* Android SDK

**Steps:**

1. Clone the main PwdHash repository:
   ```bash
   git clone https://github.com/FireBurn/PwdHash.git
   ```
2. Open Android Studio.
3. Choose **"Open an Existing Project"** and select the `Android/` subdirectory from the cloned
   repository.
4. Let Gradle sync the project dependencies.
5. Run the app on an emulator or a physical device.

To build a testable debug version from the command line:

```bash
# Navigate into the Android project directory first
cd Android
./gradlew assembleDebug
```

The debug APK will be available at `app/build/outputs/apk/debug/app-debug.apk`.

## Technology Stack

- **UI Framework**: Jetpack Compose with Material 3
- **Language**: Kotlin
- **Security**: Android Keystore, EncryptedSharedPreferences, BiometricPrompt
- **Cryptography**: PBKDF2 with SHA-256 (300,000 iterations)
- **Architecture**: Modern Android architecture with ViewModels and State management

## How to Use

1. **First Launch**: Set up your master password (securely stored and encrypted)
2. **Generate Password**: Enter a URL or domain (e.g., `google.com` or `https://github.com`)
3. **Authenticate**: Use your fingerprint, face, or PIN to unlock
4. **Copy Password**: Tap the Copy button on either the Modern or Legacy password card
5. **Paste**: Paste the password into your login form

### Share Target Usage

From any browser:

1. Navigate to the login page
2. Tap Share → PwdHash
3. Authenticate with biometrics
4. Password is automatically copied
5. Paste into the password field

## Security Notes

- Your master password is encrypted using Android Keystore
- Biometric authentication required for every password generation
- Passwords are never logged or stored
- All cryptographic operations happen on-device
- The app is compatible with Android's security best practices

## License

This project is licensed under the BSD 3-Clause License. See the main [LICENSE](../LICENSE) file for
full details.
