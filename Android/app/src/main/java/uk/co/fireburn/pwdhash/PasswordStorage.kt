package uk.co.fireburn.pwdhash

import android.content.Context
import android.content.SharedPreferences
import java.util.Base64

class PasswordStorage(context: Context) {
    private val applicationContext = context.applicationContext
    private val preferences = applicationContext.getSharedPreferences(
        STORAGE_PREFERENCES_FILE,
        Context.MODE_PRIVATE
    )

    /** The 4.0 and earlier store, encrypted with a key that needed no authentication. */
    private val legacyPreferences = applicationContext.getSharedPreferences(
        LEGACY_STORAGE_PREFERENCES_FILE,
        Context.MODE_PRIVATE
    )

    /**
     * Saving needs a recent authentication, because the key it encrypts with does. Call this from
     * inside a successful BiometricAuth.authenticate callback.
     */
    fun saveMasterPassword(password: String) {
        synchronized(STORAGE_LOCK) {
            if (password.isEmpty()) {
                clearMasterPasswordLocked()
            } else {
                saveMasterPasswordLocked(password)
            }
        }
    }

    fun clearMasterPassword() {
        synchronized(STORAGE_LOCK) {
            clearMasterPasswordLocked()
        }
    }

    /** Also needs a recent authentication. Migrates a 4.0 payload across on the way. */
    fun getMasterPassword(): String? = synchronized(STORAGE_LOCK) {
        getMasterPasswordLocked()
    }

    fun hasMasterPassword(): Boolean = synchronized(STORAGE_LOCK) {
        hasPayload(preferences) || hasPayload(legacyPreferences)
    }

    private fun saveMasterPasswordLocked(password: String) {
        val plaintext = password.toByteArray(Charsets.UTF_8)
        try {
            val payload = AesGcmPasswordCipher.encrypt(
                key = PasswordKeyStore.getOrCreateKey(),
                plaintext = plaintext,
                associatedData = ASSOCIATED_DATA
            )
            val saved = preferences.edit()
                .putInt(KEY_FORMAT_VERSION, FORMAT_VERSION)
                .putString(KEY_INITIALIZATION_VECTOR, ENCODER.encodeToString(payload.iv))
                .putString(KEY_CIPHERTEXT, ENCODER.encodeToString(payload.ciphertext))
                .commit()
            check(saved) { "The encrypted master password could not be saved." }
        } finally {
            plaintext.fill(0)
        }
    }

    private fun getMasterPasswordLocked(): String? {
        if (!hasPayload(preferences)) {
            return migrateLegacyPassword()
        }

        check(preferences.getInt(KEY_FORMAT_VERSION, 0) == FORMAT_VERSION) {
            "Unsupported encrypted master password format."
        }
        val key = checkNotNull(PasswordKeyStore.getExistingKey()) {
            "The encrypted master password exists, but its Android Keystore key is missing."
        }
        return decrypt(preferences, key, ASSOCIATED_DATA)
    }

    /**
     * Moves a master password saved by 4.0 or earlier onto the authentication-bound key. The old
     * key needs no authentication to read, and the new one is being written from inside an
     * authenticated call, so this can happen quietly the first time the password is used.
     */
    private fun migrateLegacyPassword(): String? {
        if (!hasPayload(legacyPreferences)) return null

        val legacyKey = PasswordKeyStore.getExistingKey(PasswordKeyStore.LEGACY_KEY_ALIAS)
            ?: run {
                // The payload cannot be read without its key; drop it rather than fail forever.
                clearLegacyLocked()
                return null
            }
        val password = decrypt(legacyPreferences, legacyKey, LEGACY_ASSOCIATED_DATA)

        if (password != null) saveMasterPasswordLocked(password)
        clearLegacyLocked()
        return password
    }

    private fun decrypt(
        store: SharedPreferences,
        key: javax.crypto.SecretKey,
        associatedData: ByteArray
    ): String? {
        val iv = DECODER.decode(store.getString(KEY_INITIALIZATION_VECTOR, null) ?: return null)
        val ciphertext = DECODER.decode(store.getString(KEY_CIPHERTEXT, null) ?: return null)
        val plaintext = AesGcmPasswordCipher.decrypt(
            key = key,
            iv = iv,
            ciphertext = ciphertext,
            associatedData = associatedData
        )
        return try {
            plaintext.toString(Charsets.UTF_8)
        } finally {
            plaintext.fill(0)
        }
    }

    private fun clearMasterPasswordLocked() {
        val cleared = preferences.edit().clear().commit()
        check(cleared) { "The encrypted master password could not be cleared." }
        clearLegacyLocked()
        // Clear the payload first. If Keystore deletion then fails, the remaining orphaned key is
        // harmless and can be reused; deleting the key first could leave an undecryptable payload.
        try {
            PasswordKeyStore.deleteKey()
        } catch (_: Exception) {
            // With no ciphertext remaining, an orphaned non-exportable key cannot reveal data.
        }
    }

    private fun clearLegacyLocked() {
        legacyPreferences.edit().clear().commit()
        try {
            PasswordKeyStore.deleteKey(PasswordKeyStore.LEGACY_KEY_ALIAS)
        } catch (_: Exception) {
            // As above: without ciphertext, an orphaned key reveals nothing.
        }
    }

    private fun hasPayload(store: SharedPreferences): Boolean {
        val hasIv = store.contains(KEY_INITIALIZATION_VECTOR)
        val hasCiphertext = store.contains(KEY_CIPHERTEXT)
        check(hasIv == hasCiphertext) { "The encrypted master password is incomplete." }
        return hasIv
    }

    private companion object {
        const val STORAGE_PREFERENCES_FILE = "pwdhash_secure_storage_v3"
        const val LEGACY_STORAGE_PREFERENCES_FILE = "pwdhash_secure_storage_v2"
        const val KEY_FORMAT_VERSION = "format_version"
        const val KEY_INITIALIZATION_VECTOR = "master_password_iv"
        const val KEY_CIPHERTEXT = "master_password_ciphertext"
        const val FORMAT_VERSION = 3

        val ASSOCIATED_DATA =
            "uk.co.fireburn.pwdhash.master_password.v3".toByteArray(Charsets.UTF_8)
        val LEGACY_ASSOCIATED_DATA =
            "uk.co.fireburn.pwdhash.master_password.v2".toByteArray(Charsets.UTF_8)
        val ENCODER: Base64.Encoder = Base64.getEncoder()
        val DECODER: Base64.Decoder = Base64.getDecoder()
        val STORAGE_LOCK = Any()
    }
}
