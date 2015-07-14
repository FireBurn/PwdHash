package uk.co.fireburn.pwdhash

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

class PasswordStorage(context: Context) {
    private val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

    private val sharedPreferences = EncryptedSharedPreferences.create(
        "master_password_prefs",
        masterKeyAlias,
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveMasterPassword(password: String) {
        with(sharedPreferences.edit()) {
            putString("master_password", password)
            apply()
        }
    }

    fun getMasterPassword(): String? {
        return sharedPreferences.getString("master_password", null)
    }

    fun hasMasterPassword(): Boolean {
        return sharedPreferences.contains("master_password")
    }
}
