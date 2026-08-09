package uk.co.fireburn.pwdhash

import android.app.KeyguardManager
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

/** Centralizes biometric and device-credential authentication. */
object BiometricAuth {

    internal data class AuthenticatorSelection(
        val allowedAuthenticators: Int,
        val biometricAvailable: Boolean,
        val deviceCredentialAvailable: Boolean
    )

    /**
     * Selects an authenticator set that also works before API 30, where device credentials cannot
     * be requested on their own. BIOMETRIC_WEAK | DEVICE_CREDENTIAL lets AndroidX fall straight
     * back to the device PIN, pattern, or password when a device has no biometric sensor.
     */
    internal fun selectAuthenticators(
        biometricStatus: Int,
        isDeviceSecure: Boolean
    ): AuthenticatorSelection? {
        val biometricAvailable = biometricStatus == BiometricManager.BIOMETRIC_SUCCESS

        return when {
            isDeviceSecure -> AuthenticatorSelection(
                allowedAuthenticators =
                    BiometricManager.Authenticators.BIOMETRIC_WEAK or
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL,
                biometricAvailable = biometricAvailable,
                deviceCredentialAvailable = true
            )

            biometricAvailable -> AuthenticatorSelection(
                allowedAuthenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK,
                biometricAvailable = true,
                deviceCredentialAvailable = false
            )

            else -> null
        }
    }

    internal fun unavailableMessage(biometricStatus: Int): String = when (biometricStatus) {
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
            "Authentication hardware is temporarily unavailable. Please try again."

        BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED ->
            "Biometric authentication needs a device security update. Set up a screen lock or update the device."

        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
            "Set up a fingerprint, face unlock, or device screen lock before generating passwords."

        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE ->
            "This device has no biometric sensor. Set up a PIN, pattern, or password in device settings to continue."

        else ->
            "No supported authentication method is available. Set up a device screen lock to continue."
    }

    fun authenticate(
        activity: AppCompatActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
        onCancel: () -> Unit = {}
    ) {
        val biometricStatus = BiometricManager.from(activity)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
        val isDeviceSecure = activity.getSystemService(KeyguardManager::class.java)
            ?.isDeviceSecure == true
        val selection = selectAuthenticators(biometricStatus, isDeviceSecure)

        if (selection == null) {
            onError(unavailableMessage(biometricStatus))
            return
        }

        val executor = ContextCompat.getMainExecutor(activity)
        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    if (
                        errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                        errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                        errorCode == BiometricPrompt.ERROR_CANCELED
                    ) {
                        onCancel()
                    } else {
                        onError("Authentication error: $errString")
                    }
                }

                // A rejected scan is not terminal; the system prompt remains open for another try.
                override fun onAuthenticationFailed() = Unit
            }
        )

        val subtitle = when {
            selection.biometricAvailable && selection.deviceCredentialAvailable ->
                "Use biometrics or your device screen lock to continue"

            selection.biometricAvailable ->
                "Use biometrics to continue"

            else ->
                "Use your device PIN, pattern, or password to continue"
        }
        val promptBuilder = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authenticate to generate password")
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(selection.allowedAuthenticators)

        // A negative button is mandatory when device credentials are not an allowed fallback.
        if (!selection.deviceCredentialAvailable) {
            promptBuilder.setNegativeButtonText("Cancel")
        }

        try {
            biometricPrompt.authenticate(promptBuilder.build())
        } catch (exception: IllegalArgumentException) {
            onError("This device does not support the requested authentication method.")
        }
    }
}
