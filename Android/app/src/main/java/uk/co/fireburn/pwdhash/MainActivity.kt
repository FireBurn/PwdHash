package uk.co.fireburn.pwdhash

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uk.co.fireburn.pwdhash.ui.theme.PwdHashTheme

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge display
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false)

        val passwordStorage = PasswordStorage(applicationContext)

        setContent {
            PwdHashTheme {
                AppScreen(passwordStorage, this@MainActivity)
            }
        }
    }
}

@Composable
fun AppScreen(passwordStorage: PasswordStorage, activity: AppCompatActivity) {
    val context = LocalContext.current
    val initialStorageState = remember { runCatching(passwordStorage::hasMasterPassword) }
    var hasMasterPassword by remember {
        mutableStateOf(initialStorageState.getOrDefault(false))
    }
    var showSettingsScreen by remember { mutableStateOf(false) }

    LaunchedEffect(initialStorageState.exceptionOrNull()) {
        if (initialStorageState.isFailure) {
            Toast.makeText(
                context,
                "The saved master password could not be opened. Please set it again.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        if (showSettingsScreen) {
            SettingsScreen(
                onNavigateBack = { showSettingsScreen = false },
                onDeletePassword = {
                    runCatching(passwordStorage::clearMasterPassword).fold(
                        onSuccess = {
                            hasMasterPassword = false
                            showSettingsScreen = false
                            true
                        },
                        onFailure = { false }
                    )
                }
            )
        } else if (hasMasterPassword) {
            GeneratorScreen(
                activity = activity,
                onShowSettings = { showSettingsScreen = true }
            )
        } else {
            SetupScreen(onPasswordSaved = {
                runCatching { passwordStorage.saveMasterPassword(it) }.fold(
                    onSuccess = {
                        hasMasterPassword = true
                        true
                    },
                    onFailure = { false }
                )
            })
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetupScreen(onPasswordSaved: (String) -> Boolean) {
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "PwdHash",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                },
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            Text(
                "Welcome to PwdHash!",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary
            )

            Text(
                "Create a master password that you'll use to generate unique passwords for all your websites. " +
                        "This password is encrypted and stored securely on your device.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Setup Card
            androidx.compose.material3.Card(
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = androidx.compose.material3.CardDefaults.cardElevation(
                    defaultElevation = 2.dp
                )
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Enter Master Password") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Next
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        label = { Text("Confirm Master Password") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        onClick = {
                            if (password.isNotEmpty() && password == confirmPassword) {
                                if (onPasswordSaved(password)) {
                                    Toast.makeText(
                                        context,
                                        "Master password saved!",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                } else {
                                    Toast.makeText(
                                        context,
                                        "Could not save the master password. Please try again.",
                                        Toast.LENGTH_LONG
                                    ).show()
                                }
                            } else {
                                Toast.makeText(
                                    context,
                                    "Passwords do not match or are empty.",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Text("Save Master Password", modifier = Modifier.padding(vertical = 4.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GeneratorScreen(activity: AppCompatActivity, onShowSettings: () -> Unit) {
    var domain by remember { mutableStateOf("") }
    var generatedModernPassword by remember { mutableStateOf("") }
    var generatedLegacyPassword by remember { mutableStateOf("") }
    var showHelpCard by remember { mutableStateOf(true) }
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val passwordStorage = remember { PasswordStorage(context) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "PwdHash",
                            style = MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            "Secure Password Generator",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onShowSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Dismissible Help Card
            if (showHelpCard) {
                androidx.compose.material3.Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = androidx.compose.material3.CardDefaults.cardColors(
                        containerColor = Color(0xFFEFF6FF)
                    ),
                    elevation = androidx.compose.material3.CardDefaults.cardElevation(
                        defaultElevation = 1.dp
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    "ℹ️",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(end = 8.dp)
                                )
                                Text(
                                    "How to Use PwdHash",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            IconButton(
                                onClick = { showHelpCard = false },
                                modifier = Modifier.padding(0.dp)
                            ) {
                                Text("✕", color = Color(0xFF64748B), fontSize = 18.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "PwdHash generates unique, secure passwords for each website you use. " +
                                    "You can either:",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF1E40AF)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                "• ",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF1E40AF)
                            )
                            Text(
                                "Enter a website address below (like amazon.com or https://github.com)",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF1E40AF)
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                "• ",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFF1E40AF)
                            )
                            Column {
                                Text(
                                    "Share a URL from your browser to PwdHash",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color(0xFF1E40AF)
                                )
                                Text(
                                    "(Tap Share → PwdHash from any website)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF3B82F6),
                                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Input Card
            androidx.compose.material3.Card(
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = androidx.compose.material3.CardDefaults.cardElevation(
                    defaultElevation = 2.dp
                )
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    OutlinedTextField(
                        value = domain,
                        onValueChange = {
                            domain = it
                            generatedModernPassword = ""
                            generatedLegacyPassword = ""
                        },
                        label = { Text("Website Address") },
                        placeholder = { Text("amazon.com or https://github.com") },
                        supportingText = {
                            Text(
                                "Enter any website name or full URL",
                                style = MaterialTheme.typography.bodySmall
                            )
                        },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(
                            autoCorrectEnabled = false,
                            keyboardType = KeyboardType.Uri,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() })
                    )

                    val effectiveDomain = PasswordGenerator.getSite(domain)
                    if (domain.isNotBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (effectiveDomain != null) "Using domain: $effectiveDomain" else "Invalid input",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (effectiveDomain != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(start = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (effectiveDomain != null) {
                                focusManager.clearFocus()
                                BiometricAuth.authenticate(
                                    activity = activity,
                                    onSuccess = {
                                        try {
                                            val masterPassword =
                                                passwordStorage.getMasterPassword()
                                                    ?: error("No saved master password")
                                            generatedModernPassword =
                                                PasswordGenerator.generateSecurePassword(
                                                    masterPassword,
                                                    effectiveDomain
                                                )
                                            generatedLegacyPassword =
                                                PasswordGenerator.generateLegacyPassword(
                                                    masterPassword,
                                                    effectiveDomain
                                                )
                                        } catch (_: Exception) {
                                            generatedModernPassword = ""
                                            generatedLegacyPassword = ""
                                            Toast.makeText(
                                                context,
                                                "Could not access the saved master password.",
                                                Toast.LENGTH_LONG
                                            ).show()
                                        }
                                    },
                                    onError = { errorMessage ->
                                        Toast.makeText(context, errorMessage, Toast.LENGTH_SHORT)
                                            .show()
                                    }
                                )
                            } else {
                                Toast.makeText(
                                    context,
                                    "Please enter a valid website address (e.g., amazon.com)",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Text("Generate Passwords", modifier = Modifier.padding(vertical = 4.dp))
                    }
                }
            }

            // Modern Password Card
            if (generatedModernPassword.isNotEmpty()) {
                androidx.compose.material3.Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = androidx.compose.material3.CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    border = androidx.compose.foundation.BorderStroke(
                        3.dp,
                        MaterialTheme.colorScheme.tertiary
                    ),
                    elevation = androidx.compose.material3.CardDefaults.cardElevation(
                        defaultElevation = 2.dp
                    )
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Modern Password",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                            Surface(
                                color = Color(0xFFDCFCE7),
                                shape = androidx.compose.foundation.shape.RoundedCornerShape(99.dp)
                            ) {
                                Text(
                                    "SECURE",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.tertiary,
                                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Text(
                            "Uses PBKDF2-SHA256 (300k iterations)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.padding(top = 4.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = generatedModernPassword,
                                onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.weight(1f),
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                    fontSize = 14.sp
                                ),
                                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                                    disabledContainerColor = Color(0xFFF1F5F9),
                                    disabledTextColor = Color(0xFF334155)
                                ),
                                enabled = false
                            )
                            Button(
                                onClick = {
                                    ClipboardUtils.copyPassword(
                                        context = context,
                                        password = generatedModernPassword,
                                        label = "Modern Password"
                                    )
                                    Toast.makeText(
                                        context,
                                        "Modern password copied!",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            ) {
                                Text("Copy")
                            }
                        }
                    }
                }
            }

            // Legacy Password Card
            if (generatedLegacyPassword.isNotEmpty()) {
                androidx.compose.material3.Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = androidx.compose.material3.CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    border = androidx.compose.foundation.BorderStroke(
                        3.dp,
                        Color(0xFFEA580C)
                    ),
                    elevation = androidx.compose.material3.CardDefaults.cardElevation(
                        defaultElevation = 2.dp
                    )
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Legacy Password",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                            Surface(
                                color = Color(0xFFFFEDD5),
                                shape = androidx.compose.foundation.shape.RoundedCornerShape(99.dp)
                            ) {
                                Text(
                                    "OLD SITE",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFFEA580C),
                                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Text(
                            "HMAC-MD5. Use only for old accounts.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.padding(top = 4.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = generatedLegacyPassword,
                                onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.weight(1f),
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                    fontSize = 14.sp
                                ),
                                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                                    disabledContainerColor = Color(0xFFF1F5F9),
                                    disabledTextColor = Color(0xFF334155)
                                ),
                                enabled = false
                            )
                            Button(
                                onClick = {
                                    ClipboardUtils.copyPassword(
                                        context = context,
                                        password = generatedLegacyPassword,
                                        label = "Legacy Password"
                                    )
                                    Toast.makeText(
                                        context,
                                        "Legacy password copied!",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            ) {
                                Text("Copy")
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onNavigateBack: () -> Unit, onDeletePassword: () -> Boolean) {
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
                        if (onDeletePassword()) {
                            Toast.makeText(
                                context,
                                "Master password deleted.",
                                Toast.LENGTH_SHORT
                            ).show()
                            showDeleteDialog = false
                        } else {
                            Toast.makeText(
                                context,
                                "Could not delete the master password. Please try again.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
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
