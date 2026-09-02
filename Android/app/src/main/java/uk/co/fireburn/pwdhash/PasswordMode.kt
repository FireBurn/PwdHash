package uk.co.fireburn.pwdhash

/** Which generation algorithm - and so which domain rule - a password is being made with. */
enum class PasswordMode {
    /** PBKDF2-SHA256, new to this project. Salted with a Public Suffix List domain. */
    MODERN,

    /** HMAC-MD5, compatible with the original PwdHash. Salted with the original's domain rule. */
    LEGACY
}
