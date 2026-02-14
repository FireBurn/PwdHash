package uk.co.fireburn.pwdhash

import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

/**
 * A centralized helper object for handling biometric authentication.
 */
object BiometricAuth {

    /**
     * Shows a biometric prompt to the user.
     * @param activity The activity context needed to show the prompt.
     * @param onSuccess A lambda function to be executed upon successful authentication.
     * @param onError A lambda function to be executed on failure or error, passing an error message.
     * @param onCancel A lambda function to be executed if the user cancels.
     */
    fun authenticate(
        activity: AppCompatActivity,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
        onCancel: () -> Unit = {} // Default empty implementation
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val biometricPrompt = BiometricPrompt(
            activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    // Don't show a toast for user cancellation
                    if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON || errorCode == BiometricPrompt.ERROR_USER_CANCELED) {
                        onCancel()
                    } else {
                        onError("Authentication error: $errString")
                    }
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    onError("Authentication failed. Please try again.")
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authenticate to generate password")
            .setSubtitle("Use your fingerprint or face to continue")
            .setNegativeButtonText("Cancel")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }
}
