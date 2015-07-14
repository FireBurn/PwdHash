package uk.co.fireburn.pwdhash

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class ShareActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (intent?.action != Intent.ACTION_SEND) {
            finish()
            return
        }

        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
        val domain = sharedText?.let { PasswordGenerator.getSite(it) }

        if (domain == null) {
            Toast.makeText(this, "Could not extract a valid domain.", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val passwordStorage = PasswordStorage(this)
        if (!passwordStorage.hasMasterPassword()) {
            Toast.makeText(this, "No master password set. Please open the app first.", Toast.LENGTH_LONG).show()
            finish()
            return
        }
        val masterPassword = passwordStorage.getMasterPassword()!!

        // Use the centralized BiometricAuth helper
        BiometricAuth.authenticate(
            activity = this,
            onSuccess = {
                val generatedPassword = PasswordGenerator.generateSecurePassword(masterPassword, domain)
                copyToClipboard(generatedPassword)
                Toast.makeText(this, "Password copied to clipboard!", Toast.LENGTH_SHORT).show()
                finish()
            },
            onError = { errorMessage ->
                Toast.makeText(this, errorMessage, Toast.LENGTH_SHORT).show()
                finish()
            },
            onCancel = {
                finish() // Just finish the activity if the user cancels
            }
        )
    }

    private fun copyToClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Generated Password", text)
        clipboard.setPrimaryClip(clip)
    }
}
