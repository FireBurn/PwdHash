# PwdHash - Web Companion

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Live Website](https://img.shields.io/badge/Live-Website-success.svg)](https://fireburn.github.io/PwdHash/)

This is the web-based component of the multi-platform PwdHash project. It's a static, client-side web application that allows you to generate your per-site passwords from any modern web browser without needing to install software.

The website features a **clean, modern card-based design** with blue accents and clear security indicators, matching the Android app and Chrome extension.

For a full overview of the project's philosophy and shared cryptographic model, please see the [**main project README**](../README.md).

## Features

* 🎨 **Modern Card-Based UI**: Clean design with color-coded password cards
* 🔒 **Visual Security Indicators**: Green "SECURE" badges for modern passwords, orange "OLD SITE" for legacy
* 🔄 **Identical Password Generation**: Uses the exact same modern cryptographic algorithm as the extension and Android app
* 🌐 **Purely Client-Side**: All calculations are performed locally in your browser using the standard Web Crypto API. No data is ever sent to a server
* 📋 **Copy to Clipboard**: One-click copy buttons for each generated password
* 📱 **Responsive Design**: Works perfectly on desktop and mobile browsers
* 🚀 **Zero Installation**: Just visit the website, no downloads required

## User Interface

The website displays password generation in a card-based layout:

- **Modern Password Card**: Green left border with "SECURE" badge - PBKDF2-SHA256 (300k iterations)
- **Legacy Password Card**: Orange left border with "OLD SITE" badge - HMAC-MD5 for compatibility
- **Domain Preview**: Shows the effective domain being used for password generation
- **Clean Input Section**: Simple, focused interface for entering site address and master password

## Screenshot

![Website UI Screenshot](_assets/website-screenshot.png)
*(Please place a screenshot of the website in an `_assets` folder within this directory.)*

## Usage

Simply access the live website hosted via GitHub Pages:
[**https://fireburn.github.io/PwdHash/**](https://fireburn.github.io/PwdHash/)

### How to Use

1. **Enter Site Address**: Type the URL or domain (e.g., `gmail.com` or `https://github.com`)
2. **Enter Master Password**: Type your single master password
3. **Generate**: Click "Generate Passwords" button
4. **Copy**: Use the copy button next to the password you want to use
   - Modern password (recommended) - most secure
   - Legacy password - only for old accounts

The website will show you the effective domain being used (e.g., `google.com` for `mail.google.com`).

## Running Locally

As this is a static website, no build step is required.

1. Clone the main PwdHash repository.
2. You can open the `docs/index.html` file directly in your web browser.

For the best experience, run a simple local web server from within the `docs` directory:
```bash
cd docs
python -m http.server
```

Then visit `http://localhost:8000` in your browser.

## Technology Stack

- **HTML/CSS/JavaScript**: Pure vanilla web technologies, no frameworks
- **Web Crypto API**: Native browser cryptography for PBKDF2-SHA256
- **Responsive Design**: CSS Flexbox for mobile and desktop layouts
- **Zero Dependencies**: No external libraries, works entirely offline
- **Modern CSS**: CSS custom properties (variables) for consistent theming

## Security Features

- **Client-Side Only**: All operations happen in your browser, nothing sent to servers
- **No Password Storage**: Master password is never saved anywhere
- **Domain Isolation**: Each site gets a unique password
- **Modern Algorithm**: PBKDF2 with 300,000 iterations resists brute-force attacks
- **Visual Security Indicators**: Clear badges show which algorithm is most secure

## Design System

The website uses a unified design system shared across all PwdHash platforms:

- **Primary Color**: Blue (#2563EB)
- **Success Color**: Green (#16A34A) for secure passwords
- **Warning Color**: Orange (#EA580C) for legacy passwords
- **Card Borders**: Left-side colored borders for visual distinction
- **Clean Typography**: System font stack for native feel

## Browser Compatibility

Works in all modern browsers supporting the Web Crypto API:
- Chrome 37+
- Firefox 34+
- Safari 11+
- Edge 79+

## License

This project is licensed under the BSD 3-Clause License. See the main [LICENSE](../LICENSE) file for full details.
