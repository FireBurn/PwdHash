package uk.co.fireburn.pwdhash

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

internal object PasswordKeyStore {
    private const val KEYSTORE_PROVIDER = "AndroidKeyStore"

    /**
     * The key the master password is encrypted with. It requires the user to have authenticated
     * recently, so the biometric prompt is no longer only a screen the app draws: without a real
     * unlock, Keystore itself refuses to hand the key over and the ciphertext cannot be read,
     * even by something that has the app's files.
     */
    const val KEY_ALIAS = "pwdhash_master_password_v3"

    /** The 4.0 and earlier key, which had no such requirement. Read only, to migrate off it. */
    const val LEGACY_KEY_ALIAS = "pwdhash_master_password_v2"

    /**
     * How long a single authentication keeps the key usable. Long enough to derive a password
     * after the prompt closes, short enough that a phone left unattended is not an open door.
     */
    private const val AUTHENTICATION_VALIDITY_SECONDS = 30

    private val lock = Any()

    fun getExistingKey(alias: String = KEY_ALIAS): SecretKey? = synchronized(lock) {
        loadKeyStore().getKey(alias, null) as? SecretKey
    }

    fun getOrCreateKey(): SecretKey = synchronized(lock) {
        val keyStore = loadKeyStore()
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey) ?: generateKey()
    }

    fun deleteKey(alias: String = KEY_ALIAS) = synchronized(lock) {
        val keyStore = loadKeyStore()
        if (keyStore.containsAlias(alias)) {
            keyStore.deleteEntry(alias)
        }
    }

    private fun generateKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            KEYSTORE_PROVIDER
        )
        val specification = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setKeySize(256)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .setUserAuthenticationRequired(true)
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    // A strong biometric or the device credential. Weak biometrics cannot unlock
                    // a time-bound key, which is why BiometricAuth asks for BIOMETRIC_STRONG.
                    setUserAuthenticationParameters(
                        AUTHENTICATION_VALIDITY_SECONDS,
                        KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL
                    )
                } else {
                    @Suppress("DEPRECATION")
                    setUserAuthenticationValidityDurationSeconds(AUTHENTICATION_VALIDITY_SECONDS)
                }
            }
            .build()
        keyGenerator.init(specification)
        return keyGenerator.generateKey()
    }

    private fun loadKeyStore(): KeyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply {
        load(null)
    }
}
