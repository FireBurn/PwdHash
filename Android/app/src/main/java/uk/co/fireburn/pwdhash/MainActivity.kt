package uk.co.fireburn.pwdhash

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import uk.co.fireburn.pwdhash.ui.theme.PwdHashTheme

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val passwordStorage = PasswordStorage(applicationContext)

        setContent {
            PwdHashTheme {
                AppScreen(passwordStorage)
            }
        }
    }
}

@Composable
fun AppScreen(passwordStorage: PasswordStorage) {
    var hasMasterPassword by remember { mutableStateOf(passwordStorage.hasMasterPassword()) }
    var showSettingsScreen by remember { mutableStateOf(false) }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        if (showSettingsScreen) {
            SettingsScreen(
                onNavigateBack = { showSettingsScreen = false },
                onDeletePassword = {
                    passwordStorage.saveMasterPassword("") // Clear the password
                    hasMasterPassword = false
                    showSettingsScreen = false
                }
            )
        } else if (hasMasterPassword) {
            GeneratorScreen(
                onShowSettings = { showSettingsScreen = true }
            )
        } else {
            SetupScreen(onPasswordSaved = {
                passwordStorage.saveMasterPassword(it)
                hasMasterPassword = true
            })
        }
    }
}

@Composable
fun SetupScreen(onPasswordSaved: (String) -> Unit) {
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    val context = LocalContext.current
    Column(
        modifier = Modifier.padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Setup Master Password", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "This password will be stored securely on your device and is required to generate passwords.",
            modifier = Modifier.padding(horizontal = 8.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Enter Master Password") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = confirmPassword,
            onValueChange = { confirmPassword = it },
            label = { Text("Confirm Master Password") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = {
            if (password.isNotEmpty() && password == confirmPassword) {
                onPasswordSaved(password)
                Toast.makeText(context, "Master password saved!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(context, "Passwords do not match or are empty.", Toast.LENGTH_SHORT)
                    .show()
            }
        }) { Text("Save Master Password") }
    }
}

@Composable
fun GeneratorScreen(onShowSettings: () -> Unit) {
    var domain by remember { mutableStateOf("") }
    var generatedModernPassword by remember { mutableStateOf("") }
    var generatedLegacyPassword by remember { mutableStateOf("") }
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val passwordStorage = remember { PasswordStorage(context) }
    val activity = LocalContext.current as AppCompatActivity

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        // UI FIX: Arrange from the top with spacing instead of centering
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.Top)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            IconButton(onClick = onShowSettings) {
                Icon(Icons.Default.Settings, contentDescription = "Settings")
            }
        }

        Text("PwdHash Password Generator", style = MaterialTheme.typography.headlineSmall)

        OutlinedTextField(
            value = domain,
            onValueChange = {
                domain = it
                generatedModernPassword = "" // Clear previous passwords when domain changes
                generatedLegacyPassword = ""
            },
            label = { Text("Enter URL or Domain") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(
                autoCorrect = false,
                keyboardType = KeyboardType.Uri,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() })
        )

        val effectiveDomain = PasswordGenerator.getSite(domain)
        if (domain.isNotBlank()) {
            OutlinedTextField(
                value = effectiveDomain ?: "Invalid Input",
                onValueChange = {},
                label = { Text("Domain Being Hashed") },
                readOnly = true,
                modifier = Modifier.fillMaxWidth(),
                isError = effectiveDomain == null
            )
        }

        Button(onClick = {
            if (effectiveDomain != null) {
                focusManager.clearFocus()
                BiometricAuth.authenticate(
                    activity = activity,
                    onSuccess = {
                        val masterPassword =
                            passwordStorage.getMasterPassword() ?: return@authenticate
                        generatedModernPassword = PasswordGenerator.generateSecurePassword(
                            masterPassword,
                            effectiveDomain
                        )
                        generatedLegacyPassword = PasswordGenerator.generateLegacyPassword(
                            masterPassword,
                            effectiveDomain
                        )
                    },
                    onError = { errorMessage ->
                        Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT).show()
                    }
                )
            } else {
                Toast.makeText(context, "Please enter a valid URL or domain.", Toast.LENGTH_SHORT)
                    .show()
            }
        }) { Text("Generate Passwords") }

        if (generatedModernPassword.isNotEmpty()) {
            Text("Modern Password (PBKDF2)", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = generatedModernPassword,
                onValueChange = {},
                readOnly = true,
                label = { Text("Modern Password") },
                modifier = Modifier.fillMaxWidth(),
                trailingIcon = {
                    Button(onClick = {
                        val clipboard =
                            context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Modern Password", generatedModernPassword)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Modern password copied!", Toast.LENGTH_SHORT)
                            .show()
                    }) { Text("Copy") }
                }
            )
        }

        if (generatedLegacyPassword.isNotEmpty()) {
            Text("Legacy Password (MD5)", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = generatedLegacyPassword,
                onValueChange = {},
                readOnly = true,
                label = { Text("Legacy Password") },
                modifier = Modifier.fillMaxWidth(),
                trailingIcon = {
                    Button(onClick = {
                        val clipboard =
                            context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("Legacy Password", generatedLegacyPassword)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Legacy password copied!", Toast.LENGTH_SHORT)
                            .show()
                    }) { Text("Copy") }
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onNavigateBack: () -> Unit, onDeletePassword: () -> Unit) {
    val context = LocalContext.current
    var showDeleteDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            Text("Master Password", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "The master password is encrypted and stored securely on this device. " +
                        "Deleting it will require you to set up a new one.",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { showDeleteDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
                Text("Delete Master Password")
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Master Password?") },
            text = { Text("This action cannot be undone. You will need to set up a new master password.") },
            confirmButton = {
                Button(
                    onClick = {
                        onDeletePassword()
                        Toast.makeText(context, "Master password deleted.", Toast.LENGTH_SHORT)
                            .show()
                        showDeleteDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                Button(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
