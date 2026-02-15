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
* 👆 **Biometric Authentication:** Your fingerprint, face, device PIN, or pattern is required
  before any password can be generated. Works even if you don't have biometrics set up - it will
  fall back to your device's lock screen security.
* 📤 **Seamless Share Target:** The fastest way to generate passwords! Share a URL from any
  mobile browser (Chrome, Firefox, Samsung Internet, etc.) directly to PwdHash to generate and
  copy a password instantly - no need to type the website address manually. Just navigate to the
  login page, tap Share → PwdHash, and your password is ready to paste!
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

[**Join the Android Internal Test
**](https://play.google.com/store/apps/details?id=uk.co.fireburn.pwdhash)

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

### Initial Setup

1. **First Launch**: Set up your master password
    - Choose a strong master password that you'll remember
    - This password is encrypted and stored securely on your device only
    - You'll need to enter it once, and then authenticate with your fingerprint/PIN to use it

### Generating Passwords

**Method 1: Manual Entry (Standalone Mode)**

1. **Enter a Website Address**:
    - You can enter a simple domain like `amazon.com`, `github.com`, or `netflix.com`
    - Or paste a full URL like `https://www.amazon.com/login` or `https://accounts.google.com`
    - PwdHash automatically extracts the domain (e.g., `amazon.com`) from any format you enter

2. **Authenticate**: Use your fingerprint, face, device PIN, or pattern to unlock

3. **Copy Password**: Tap the Copy button on either:
    - **Modern Password** (green card) - Use this for all new accounts
    - **Legacy Password** (orange card) - Only for older accounts created with the original PwdHash

4. **Paste**: Paste the password into your login form

**Method 2: Share from Browser (Fastest!)**

1. **Navigate** to any login page in your browser
2. **Tap Share** → Select "PwdHash" from the share menu
3. **Authenticate** with your fingerprint, face, PIN, or pattern
4. **Password automatically copied** - just paste it!

This method is faster because you don't need to manually enter the website address.

### Understanding Website Addresses

**What is a domain?** It's the main part of a website address:

- `amazon.com` is the domain for Amazon
- `bbc.co.uk` is the domain for BBC
- `github.com` is the domain for GitHub

**You can enter either:**

- Just the domain: `amazon.com`
- A full URL: `https://www.amazon.com/signin`
- A subdomain URL: `https://mail.google.com`

PwdHash automatically figures out the correct domain and shows you "Using domain: X" to confirm.

### Share Target Usage

**Quick Password Generation from Any Browser:**

PwdHash appears in your device's share menu, making password generation incredibly fast:

1. **Open your browser** and navigate to any login page (e.g., https://www.amazon.com/signin)
2. **Tap the Share button** in your browser (usually in the menu or address bar)
3. **Select "PwdHash"** from the share menu
4. **Authenticate** with your fingerprint, face, PIN, or pattern
5. **Password automatically copied!** Just paste it into the login form

**Benefits:**

- No need to manually type the website address
- Works from any browser (Chrome, Firefox, Samsung Internet, etc.)
- Faster than opening the app manually
- Automatically extracts the correct domain from the URL

**Example workflow:**

```
You're on: https://accounts.google.com/login
↓
Tap Share → PwdHash
↓
Authenticate with fingerprint/PIN
↓
✅ Password for "google.com" copied to clipboard
```

## Frequently Asked Questions

### Authentication & Security

**Q: I get "Authentication Error: No Fingerprints Enrolled" - what should I do?**

A: The latest version of the app now supports device credentials as a fallback. If you don't have
fingerprint or face recognition set up, the app will use your device's screen lock (PIN, pattern,
or password) instead. Make sure you have some form of screen lock enabled on your device.

**Q: Do I need to set up fingerprint to use this app?**

A: No! The app works with fingerprint, face recognition, PIN, pattern, or password. As long as you
have a screen lock set up on your device, you can use PwdHash.

### Using the App

**Q: What should I enter in the "Website Address" field?**

A: You can enter either:

- Just the website name: `amazon.com`, `facebook.com`, `netflix.com`
- Domain with path: `google.com/gmail`, `amazon.com/signin`, `github.com/login`
- A full URL: `https://www.amazon.com/login`
- Any URL from the site: `https://mail.google.com/inbox`

The app automatically extracts the main domain and shows you what it's using.

**Q: What's the difference between Modern and Legacy passwords?**

A:

- **Modern Password (green card)**: Uses the latest, strongest cryptography (PBKDF2-SHA256). Use
  this for all new accounts and whenever changing passwords.
- **Legacy Password (orange card)**: Uses older HMAC-MD5 algorithm for compatibility with accounts
  created using the original Stanford PwdHash. Only use this if you have old accounts that need it.

**Q: Can I use the same website address format every time?**

A: Yes! Whether you enter `amazon.com` or `https://www.amazon.com/signin`, PwdHash will always
extract `amazon.com` and generate the same password. The app is smart about finding the domain.

**Q: What's the fastest way to generate a password?**

A: Use the Share feature! From any browser:

1. Navigate to the login page
2. Tap Share → PwdHash
3. Authenticate
4. Password is automatically copied

This is faster than manually opening the app and typing the website address.

**Q: How do I access the Share feature?**

A: The Share option appears in your device's share menu:

- **Chrome**: Tap the ⋮ menu → Share
- **Firefox**: Tap the ⋮ menu → Share
- **Samsung Internet**: Tap the menu → Share
- Then select "PwdHash" from the list of apps

If you don't see PwdHash in the share menu, check the app settings or try reinstalling.

### Privacy & Data

**Q: Where is my master password stored?**

A: Your master password is encrypted and stored only on your device using Android's secure Keystore
system. It never leaves your device and is protected by your device's hardware security.

**Q: What if I lose my phone?**

A: Your master password is encrypted with keys that are tied to your specific device. However, as
long as you remember your master password, you can set up PwdHash on a new device and regenerate
all your passwords—they'll be identical since PwdHash is deterministic.

## Security Notes

- Your master password is encrypted using Android Keystore
- Biometric or device credential authentication (fingerprint, face, PIN, or pattern) required for
  every password generation
- If biometrics aren't available, the app will use your device's screen lock (PIN, pattern, or
  password)
- Passwords are never logged or stored
- All cryptographic operations happen on-device
- The app is compatible with Android's security best practices

## License

This project is licensed under the BSD 3-Clause License. See the main [LICENSE](../LICENSE) file for
full details.
