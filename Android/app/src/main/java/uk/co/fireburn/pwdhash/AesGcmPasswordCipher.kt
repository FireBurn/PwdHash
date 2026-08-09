package uk.co.fireburn.pwdhash

import java.security.GeneralSecurityException
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

internal object AesGcmPasswordCipher {
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val AUTHENTICATION_TAG_BITS = 128
    private const val EXPECTED_IV_BYTES = 12

    data class EncryptedPayload(val iv: ByteArray, val ciphertext: ByteArray)

    @Throws(GeneralSecurityException::class)
    fun encrypt(
        key: SecretKey,
        plaintext: ByteArray,
        associatedData: ByteArray
    ): EncryptedPayload {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        cipher.updateAAD(associatedData)
        val iv = cipher.iv
        check(iv.size == EXPECTED_IV_BYTES) { "AES-GCM produced an unexpected IV size." }
        return EncryptedPayload(iv = iv, ciphertext = cipher.doFinal(plaintext))
    }

    @Throws(GeneralSecurityException::class)
    fun decrypt(
        key: SecretKey,
        iv: ByteArray,
        ciphertext: ByteArray,
        associatedData: ByteArray
    ): ByteArray {
        require(iv.size == EXPECTED_IV_BYTES) { "Invalid AES-GCM IV size." }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.DECRYPT_MODE,
            key,
            GCMParameterSpec(AUTHENTICATION_TAG_BITS, iv)
        )
        cipher.updateAAD(associatedData)
        return cipher.doFinal(ciphertext)
    }
}
