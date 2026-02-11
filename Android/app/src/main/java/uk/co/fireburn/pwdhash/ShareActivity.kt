package uk.co.fireburn.pwdhash

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import uk.co.fireburn.pwdhash.ui.theme.PwdHashTheme

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

        // Use Compose for the choice dialog
        setContent {
            PwdHashTheme {
                SharePasswordDialog(
                    domain = domain,
                    passwordStorage = passwordStorage,
                    onDismiss = { finish() }
                )
            }
        }
    }
}

@Composable
fun SharePasswordDialog(
    domain: String,
    passwordStorage: PasswordStorage,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as AppCompatActivity
    var modernPassword by remember { mutableStateOf<String?>(null) }
    var legacyPassword by remember { mutableStateOf<String?>(null) }
    var isAuthenticating by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        BiometricAuth.authenticate(
            activity = activity,
            onSuccess = {
                val masterPassword = passwordStorage.getMasterPassword()!!
                modernPassword = PasswordGenerator.generateSecurePassword(masterPassword, domain)
                legacyPassword = PasswordGenerator.generateLegacyPassword(masterPassword, domain)
                isAuthenticating = false
            },
            onError = { errorMessage ->
                Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
                onDismiss()
            },
            onCancel = {
                onDismiss()
            }
        )
    }

    if (!isAuthenticating && modernPassword != null && legacyPassword != null) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Choose Password Type") },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Domain: $domain", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Select which password to copy:", style = MaterialTheme.typography.bodyMedium)
                }
            },
            confirmButton = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            copyToClipboard(context, modernPassword!!, "Modern Password")
                            Toast.makeText(context, "Modern password copied!", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Modern (PBKDF2)")
                    }
                    Button(
                        onClick = {
                            copyToClipboard(context, legacyPassword!!, "Legacy Password")
                            Toast.makeText(context, "Legacy password copied!", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Legacy (MD5)")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss) {
                    Text("Cancel")
                }
            }
        )
    }
}

private fun copyToClipboard(context: Context, text: String, label: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText(label, text)
    clipboard.setPrimaryClip(clip)
}
