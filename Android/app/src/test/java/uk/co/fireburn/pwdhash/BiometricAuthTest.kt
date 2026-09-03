package uk.co.fireburn.pwdhash

import androidx.biometric.BiometricManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BiometricAuthTest {

    @Test
    fun `device credential is used when no biometric hardware exists`() {
        val selection = BiometricAuth.selectAuthenticators(
            biometricStatus = BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            isDeviceSecure = true
        )

        assertNotNull(selection)
        assertFalse(selection!!.biometricAvailable)
        assertTrue(selection.deviceCredentialAvailable)
        // A time-bound Keystore key cannot be unlocked by a weak biometric, so it must not be
        // offered as an option here.
        assertEquals(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL,
            selection.allowedAuthenticators
        )
    }

    @Test
    fun `device credential remains available when biometrics are not enrolled`() {
        val selection = BiometricAuth.selectAuthenticators(
            biometricStatus = BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED,
            isDeviceSecure = true
        )

        assertNotNull(selection)
        assertFalse(selection!!.biometricAvailable)
        assertTrue(selection.deviceCredentialAvailable)
    }

    @Test
    fun `authentication is unavailable without a secure lock screen`() {
        for (status in intArrayOf(
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            BiometricManager.BIOMETRIC_SUCCESS
        )) {
            // Even with a working sensor: no lock screen means Keystore will not create the key.
            assertNull(BiometricAuth.selectAuthenticators(status, isDeviceSecure = false))
        }
    }
}
