package uk.co.fireburn.pwdhash

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class ShareModernActivity : AppCompatActivity() {
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
            Toast.makeText(
                this,
                "No master password set. Please open the app first.",
                Toast.LENGTH_LONG
            ).show()
            finish()
            return
        }

        // Authenticate and generate modern password
        BiometricAuth.authenticate(
            activity = this,
            onSuccess = {
                val masterPassword = passwordStorage.getMasterPassword()!!
                val modernPassword =
                    PasswordGenerator.generateSecurePassword(masterPassword, domain)
                copyToClipboard(this, modernPassword, "Modern Password")
                Toast.makeText(this, "Modern password copied for $domain!", Toast.LENGTH_SHORT)
                    .show()
                finish()
            },
            onError = { errorMessage ->
                Toast.makeText(this, errorMessage, Toast.LENGTH_SHORT).show()
                finish()
            },
            onCancel = {
                finish()
            }
        )
    }

    private fun copyToClipboard(context: Context, text: String, label: String) {
        val clipboard = context.getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText(label, text)
        clipboard.setPrimaryClip(clip)
    }
}
