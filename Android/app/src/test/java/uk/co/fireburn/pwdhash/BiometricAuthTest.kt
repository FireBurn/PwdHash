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
        assertEquals(
            BiometricManager.Authenticators.BIOMETRIC_WEAK or
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
    fun `authentication is unavailable without biometrics or a secure lock screen`() {
        val selection = BiometricAuth.selectAuthenticators(
            biometricStatus = BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            isDeviceSecure = false
        )

        assertNull(selection)
    }
}
