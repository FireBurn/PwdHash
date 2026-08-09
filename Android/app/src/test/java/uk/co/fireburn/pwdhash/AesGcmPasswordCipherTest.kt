package uk.co.fireburn.pwdhash

import java.security.GeneralSecurityException
import javax.crypto.KeyGenerator
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test

class AesGcmPasswordCipherTest {
    private val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
    private val associatedData = "pwdhash-test-v2".toByteArray()

    @Test
    fun `encrypted password round trips`() {
        val plaintext = "correct horse battery staple".toByteArray()

        val payload = AesGcmPasswordCipher.encrypt(key, plaintext, associatedData)
        val decrypted = AesGcmPasswordCipher.decrypt(
            key,
            payload.iv,
            payload.ciphertext,
            associatedData
        )

        assertArrayEquals(plaintext, decrypted)
    }

    @Test
    fun `repeated encryption uses a different IV and ciphertext`() {
        val plaintext = "same password".toByteArray()

        val first = AesGcmPasswordCipher.encrypt(key, plaintext, associatedData)
        val second = AesGcmPasswordCipher.encrypt(key, plaintext, associatedData)

        assertFalse(first.iv.contentEquals(second.iv))
        assertFalse(first.ciphertext.contentEquals(second.ciphertext))
    }

    @Test
    fun `tampered ciphertext is rejected`() {
        val payload = AesGcmPasswordCipher.encrypt(
            key,
            "password".toByteArray(),
            associatedData
        )
        payload.ciphertext[0] = (payload.ciphertext[0].toInt() xor 1).toByte()

        assertThrows(GeneralSecurityException::class.java) {
            AesGcmPasswordCipher.decrypt(
                key,
                payload.iv,
                payload.ciphertext,
                associatedData
            )
        }
    }
}
