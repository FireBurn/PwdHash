package uk.co.fireburn.pwdhash

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

internal enum class SharedPasswordType(
    val clipboardLabel: String,
    val displayName: String,
    val mode: PasswordMode,
    val generate: (masterPassword: String, domain: String) -> String
) {
    MODERN(
        clipboardLabel = "Modern Password",
        displayName = "Modern",
        mode = PasswordMode.MODERN,
        generate = PasswordGenerator::generateSecurePassword
    ),
    LEGACY(
        clipboardLabel = "Legacy Password",
        displayName = "Legacy",
        mode = PasswordMode.LEGACY,
        generate = PasswordGenerator::generateLegacyPassword
    )
}

abstract class SharePasswordActivity : AppCompatActivity() {
    internal abstract val passwordType: SharedPasswordType

    final override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (intent?.action != Intent.ACTION_SEND) {
            finish()
            return
        }

        // Each share target generates one kind of password, and the two kinds salt with different
        // domains, so ask for the one this activity is going to use.
        runCatching { DomainExtractor.loadPublicSuffixRules(applicationContext) }
        val domain = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)
            ?.toString()
            ?.let { runCatching { DomainExtractor.extractDomain(passwordType.mode, it) }.getOrNull() }
            ?.takeIf { it.isNotEmpty() }
        if (domain == null) {
            finishWithMessage("Could not extract a valid domain.")
            return
        }

        val passwordStorage: PasswordStorage
        val hasMasterPassword: Boolean
        try {
            passwordStorage = PasswordStorage(applicationContext)
            hasMasterPassword = passwordStorage.hasMasterPassword()
        } catch (_: Exception) {
            finishWithMessage("Could not access the encrypted master password.", Toast.LENGTH_LONG)
            return
        }
        if (!hasMasterPassword) {
            finishWithMessage(
                "No master password set. Please open the app first.",
                Toast.LENGTH_LONG
            )
            return
        }

        BiometricAuth.authenticate(
            activity = this,
            onSuccess = {
                try {
                    val masterPassword = passwordStorage.getMasterPassword()
                    if (masterPassword == null) {
                        finishWithMessage(
                            "Could not access the encrypted master password.",
                            Toast.LENGTH_LONG
                        )
                        return@authenticate
                    }

                    val generatedPassword = passwordType.generate(masterPassword, domain)
                    ClipboardUtils.copyPassword(
                        this,
                        generatedPassword,
                        passwordType.clipboardLabel
                    )
                    finishWithMessage("${passwordType.displayName} password copied for $domain!")
                } catch (_: Exception) {
                    finishWithMessage(
                        "Could not access the encrypted master password.",
                        Toast.LENGTH_LONG
                    )
                }
            },
            onError = { errorMessage ->
                finishWithMessage(errorMessage)
            },
            onCancel = ::finish
        )
    }

    private fun finishWithMessage(
        message: String,
        duration: Int = Toast.LENGTH_SHORT
    ) {
        Toast.makeText(this, message, duration).show()
        finish()
    }
}
