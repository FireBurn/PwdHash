package uk.co.fireburn.pwdhash

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.PersistableBundle

object ClipboardUtils {
    // The literal keeps the privacy hint available on Android 12 as well as newer releases.
    private const val EXTRA_IS_SENSITIVE = "android.content.extra.IS_SENSITIVE"

    fun copyPassword(context: Context, password: String, label: String) {
        val clip = ClipData.newPlainText(label, password)
        clip.description.extras = PersistableBundle().apply {
            putBoolean(EXTRA_IS_SENSITIVE, true)
        }

        context.getSystemService(ClipboardManager::class.java).setPrimaryClip(clip)
    }
}
