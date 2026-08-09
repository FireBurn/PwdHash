package uk.co.fireburn.pwdhash

import android.content.Context
import java.util.Base64

class PasswordStorage(context: Context) {
    private val applicationContext = context.applicationContext
    private val preferences = applicationContext.getSharedPreferences(
        STORAGE_PREFERENCES_FILE,
        Context.MODE_PRIVATE
    )

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

    fun getMasterPassword(): String? = synchronized(STORAGE_LOCK) {
        getMasterPasswordLocked()
    }

    fun hasMasterPassword(): Boolean = synchronized(STORAGE_LOCK) {
        if (!hasEncryptedPayload()) {
            false
        } else {
            checkNotNull(PasswordKeyStore.getExistingKey()) {
                "The encrypted master password exists, but its Android Keystore key is missing."
            }
            true
        }
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
        if (!hasEncryptedPayload()) {
            return null
        }

        check(preferences.getInt(KEY_FORMAT_VERSION, 0) == FORMAT_VERSION) {
            "Unsupported encrypted master password format."
        }
        val key = checkNotNull(PasswordKeyStore.getExistingKey()) {
            "The encrypted master password exists, but its Android Keystore key is missing."
        }
        val iv = DECODER.decode(preferences.getString(KEY_INITIALIZATION_VECTOR, null))
        val ciphertext = DECODER.decode(preferences.getString(KEY_CIPHERTEXT, null))
        val plaintext = AesGcmPasswordCipher.decrypt(
            key = key,
            iv = iv,
            ciphertext = ciphertext,
            associatedData = ASSOCIATED_DATA
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
        // Clear the payload first. If Keystore deletion then fails, the remaining orphaned key is
        // harmless and can be reused; deleting the key first could leave an undecryptable payload.
        try {
            PasswordKeyStore.deleteKey()
        } catch (_: Exception) {
            // With no ciphertext remaining, an orphaned non-exportable key cannot reveal data.
        }
    }

    private fun hasEncryptedPayload(): Boolean {
        val hasIv = preferences.contains(KEY_INITIALIZATION_VECTOR)
        val hasCiphertext = preferences.contains(KEY_CIPHERTEXT)
        check(hasIv == hasCiphertext) { "The encrypted master password is incomplete." }
        return hasIv
    }

    private companion object {
        const val STORAGE_PREFERENCES_FILE = "pwdhash_secure_storage_v2"
        const val KEY_FORMAT_VERSION = "format_version"
        const val KEY_INITIALIZATION_VECTOR = "master_password_iv"
        const val KEY_CIPHERTEXT = "master_password_ciphertext"
        const val FORMAT_VERSION = 2

        val ASSOCIATED_DATA =
            "uk.co.fireburn.pwdhash.master_password.v2".toByteArray(Charsets.UTF_8)
        val ENCODER: Base64.Encoder = Base64.getEncoder()
        val DECODER: Base64.Decoder = Base64.getDecoder()
        val STORAGE_LOCK = Any()
    }
}
