# PwdHash - Chrome Extension

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v3.1.0-brightgreen.svg)](https://chrome.google.com/webstore/detail/pwdhash-unofficial-port/bpciigjflolfjofkpaellplmgmiadkma)
[![Technology](https://img.shields.io/badge/Technology-Manifest%20V3-orange.svg)]()

This is the Chrome Extension component of the multi-platform PwdHash project. It provides a seamless
way to generate strong, per-site passwords directly within your browser.

The extension features a **modern blue gradient interface** with clear security indicators, matching
the design of the Android app and website.

For a full overview of the project's philosophy and shared cryptographic model, please see the [*
*main project README**](../README.md).

## Features

* 🎨 **Modern Interface**: Blue gradient design with glass-morphism effects
* 🔒 **Visual Security Modes**: Toggle between "Modern (SECURE)" and "Legacy (OLD)" modes
* 🔑 **Secure Per-Site Passwords**: Generates unique passwords for every website using a single
  master password
* 🛡️ **Modern Cryptography**: Uses the industry-standard **PBKDF2 with SHA-256** (300k iterations)
  to create strong, unrecoverable hashes
* ⚡ **Effortless Trigger**: Simply type `@@` at the beginning of your password in any password field
  to activate
* 💨 **Zero Storage**: Your master password is never stored or transmitted. It only exists in memory
  for a fraction of a second
* 🔄 **Cross-Platform Compatible**: Generates the exact same passwords as the companion Website and
  Android app

## User Interface

The extension includes:

- **Popup Interface**: Quick access to current domain and mode selection with a modern blue gradient
- **Options Page**: Full settings page with detailed explanations and configuration
- **In-Page Detection**: Automatic domain detection and password generation when you type `@@`
- **Consistent Icons**: Lock-with-password design matching Android app branding

## Screenshot

![Extension in action](_assets/screenshot.png)
*(Please place a screenshot of the extension in an `_assets` folder within this directory.)*

## Installation

#### From the Chrome Web Store (Recommended)

You can install the official version of this extension from the Chrome Web Store for automatic
updates and security.

[**Install PwdHash from the Chrome Web Store
**](https://chrome.google.com/webstore/detail/pwdhash-unofficial-port/bpciigjflolfjofkpaellplmgmiadkma)

#### From Source (For Developers)

1. Clone the main PwdHash repository from the root:
   ```bash
   git clone https://github.com/FireBurn/PwdHash.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **"Developer mode"** using the toggle in the top-right corner.
4. Click the **"Load unpacked"** button.
5. In the file dialog, navigate into the cloned repository and select the `Chrome/src`
   subdirectory (note: select the `src` folder, not just `Chrome`).
   The extension will now be installed locally.

## How to Use

### Method 1: Using @@ Trigger (In-Page)

1. Navigate to any website with a password field
2. Click into the password field
3. Type `@@` at the start
4. Enter your master password
5. Press Enter - your site-specific password is automatically filled

### Method 2: Using the Popup

1. Click the PwdHash icon in your browser toolbar
2. View the current domain
3. Select your preferred mode (Modern or Legacy)
4. Configure settings by clicking the Settings button

### Configuration Options

Access the options page by:

- Right-clicking the extension icon → Options
- Or clicking the Settings button in the popup

**Available Settings:**

- **Default Generation Mode**: Choose between Modern (PBKDF2-SHA256) or Legacy (HMAC-MD5)
- **Password Alert**: Toggle whether to show an alert with the generated password
- **How-to Guide**: Instructions and security information

## Building from Source

To create a distributable ZIP file:

```bash
cd Chrome
./build_zip.sh
```

This creates a `pwdhash-chrome.zip` file ready for Chrome Web Store submission.

## Technology Stack

- **Manifest Version**: V3 (latest Chrome extension standard)
- **Cryptography**: Web Crypto API for PBKDF2-SHA256
- **Storage**: chrome.storage.sync for settings (no password storage)
- **UI**: Modern HTML/CSS with blue gradient theme
- **Icons**: Multi-resolution PNG icons (16px, 48px, 128px)

## Security Features

- **No Password Storage**: Master password is never saved, only used in memory during generation
- **Domain Extraction**: Automatically extracts the registrable domain to prevent subdomain attacks
- **Modern Algorithm**: PBKDF2 with 300,000 iterations provides strong protection against
  brute-force
- **Legacy Support**: Optional compatibility mode for accounts created with older PwdHash versions

## License

This project is licensed under the BSD 3-Clause License. See the main [LICENSE](../LICENSE) file for
full details.
