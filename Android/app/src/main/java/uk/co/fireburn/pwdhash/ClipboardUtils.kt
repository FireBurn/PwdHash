package uk.co.fireburn.pwdhash

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle

object ClipboardUtils {
    // The literal keeps the privacy hint available on Android 12 as well as newer releases.
    private const val EXTRA_IS_SENSITIVE = "android.content.extra.IS_SENSITIVE"

    /** A generated password should not sit in the clipboard for the rest of the day. */
    private const val CLEAR_AFTER_MS = 60_000L

    private val handler = Handler(Looper.getMainLooper())

    fun copyPassword(context: Context, password: String, label: String) {
        val applicationContext = context.applicationContext
        val clip = ClipData.newPlainText(label, password)
        clip.description.extras = PersistableBundle().apply {
            putBoolean(EXTRA_IS_SENSITIVE, true)
        }

        applicationContext.getSystemService(ClipboardManager::class.java).setPrimaryClip(clip)
        handler.postDelayed({ clearIfStillOurs(applicationContext, password) }, CLEAR_AFTER_MS)
    }

    /**
     * Only clears the clipboard if it still holds the password we put there - whatever the user
     * has copied since is theirs, and taking it away would be worse than leaving ours.
     */
    private fun clearIfStillOurs(context: Context, password: String) {
        val clipboard = context.getSystemService(ClipboardManager::class.java) ?: return
        val current = runCatching {
            clipboard.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString()
        }.getOrNull()
        if (current != password) return

        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                clipboard.clearPrimaryClip()
            } else {
                clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
            }
        }
    }
}
