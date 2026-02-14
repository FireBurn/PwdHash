package uk.co.fireburn.pwdhash

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class PasswordStorage(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "pwdhash_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveMasterPassword(password: String) {
        sharedPreferences.edit().putString("master_password", password).apply()
    }

    fun getMasterPassword(): String? {
        return sharedPreferences.getString("master_password", null)
    }

    fun hasMasterPassword(): Boolean {
        return !getMasterPassword().isNullOrEmpty()
    }
}
