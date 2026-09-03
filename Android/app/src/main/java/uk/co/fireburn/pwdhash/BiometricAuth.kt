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
     * The master password is encrypted with a Keystore key that will only unwrap after a recent
     * authentication, and a time-bound key like that accepts a strong biometric or the device
     * credential - never a weak biometric. So this asks for BIOMETRIC_STRONG | DEVICE_CREDENTIAL
     * and AndroidX falls back to the PIN, pattern or password on its own.
     *
     * Without a secure lock screen there is nothing to authenticate against, and Keystore will
     * not create the key at all, so there is no usable configuration to offer.
     */
    internal fun selectAuthenticators(
        biometricStatus: Int,
        isDeviceSecure: Boolean
    ): AuthenticatorSelection? {
        if (!isDeviceSecure) return null

        return AuthenticatorSelection(
            allowedAuthenticators =
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL,
            biometricAvailable = biometricStatus == BiometricManager.BIOMETRIC_SUCCESS,
            deviceCredentialAvailable = true
        )
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
            "Set up a device screen lock to continue. PwdHash encrypts your master password with a key that only unlocks after you authenticate."
    }

    fun authenticate(
        activity: AppCompatActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
        onCancel: () -> Unit = {}
    ) {
        val biometricStatus = BiometricManager.from(activity)
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
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
