# PwdHash - Web Companion

[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](../LICENSE)
[![Live Website](https://img.shields.io/badge/Live-Website-success.svg)](https://fireburn.github.io/PwdHash/)

This is the web-based component of the multi-platform PwdHash project. It's a static, client-side web application that allows you to generate your per-site passwords from any modern web browser without needing to install software.

For a full overview of the project's philosophy and shared cryptographic model, please see the [**main project README](../README.md)**.

## Features

*   **Identical Password Generation:** Uses the exact same modern cryptographic algorithm as the extension and Android app.
*   **Purely Client-Side:** All calculations are performed locally in your browser using the standard Web Crypto API. No data is ever sent to a server.
*   **Clean & Simple UI:** A straightforward interface to enter a domain and master password.
*   **Copy to Clipboard:** Easily copy the generated password for use.

## Screenshot

![Website UI Screenshot](_assets/website-screenshot.png)
*(Please place a screenshot of the website in an `_assets` folder within this directory.)*

## Usage

Simply access the live website hosted via GitHub Pages:
[**https://fireburn.github.io/PwdHash/**](https://fireburn.github.io/PwdHash/)

## Running Locally

As this is a static website, no build step is required.
1.  Clone the main PwdHash repository.
2.  You can open the `docs/index.html` file directly in your web browser.

For the best experience, run a simple local web server from within the `docs` directory:
```bash
cd docs
python -m http.server
