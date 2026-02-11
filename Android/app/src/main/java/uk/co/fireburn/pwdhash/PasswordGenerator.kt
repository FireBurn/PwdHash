package uk.co.fireburn.pwdhash

import java.net.URL
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import android.util.Base64
import kotlin.random.Random

object PasswordGenerator {
    /**
     * Extracts a registrable domain from a given string.
     * @param url The input string (e.g., "https://gitlab.freedesktop.org/path").
     * @return The extracted domain (e.g., "freedesktop.org") or null if invalid.
     */
    fun getSite(url: String): String? {
        val host = try {
            URL(url).host
        } catch (e: Exception) {
            if (url.contains(".") && !url.contains("/") && !url.contains(" ")) {
                url
            } else {
                return null
            }
        } ?: return null

        val parts = host.split('.').reversed()
        if (parts.size <= 1) {
            return host
        }

        val domain = "${parts[1]}.${parts[0]}"
        val commonSecondLevels = setOf("co", "com", "org", "net", "gov", "edu")

        return if (parts.size > 2 && commonSecondLevels.contains(parts[1])) {
            "${parts[2]}.$domain"
        } else {
            domain
        }
    }

    /**
     * Generates a secure, deterministic, site-specific password using the modern PBKDF2 algorithm.
     * This version is a direct port of the final web extension's algorithm to ensure
     * identical output with alphanumeric and special symbol characters.
     */
    fun generateSecurePassword(masterPassword: String, domain: String): String {
        val length = 16 // A secure, fixed length for generated passwords.
        val iterations = 300000 // A strong, modern iteration count for PBKDF2.
        val keyLength = 256 // 32 bytes

        // These character sets include standard symbols.
        val lowercaseChars = "abcdefghijklmnopqrstuvwxyz"
        val uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        val digitChars = "0123456789"
        val symbolChars = "!@#$%^&*()_-+="
        val allChars = lowercaseChars + uppercaseChars + digitChars + symbolChars

        val spec = PBEKeySpec(masterPassword.toCharArray(), domain.toByteArray(), iterations, keyLength)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val keyBytes = factory.generateSecret(spec).encoded

        // 1. Build password, enforcing constraints
        val passwordChars = mutableListOf<Char>()
        passwordChars.add(lowercaseChars[keyBytes[0].toUByte().toInt() % lowercaseChars.length])
        passwordChars.add(uppercaseChars[keyBytes[1].toUByte().toInt() % uppercaseChars.length])
        passwordChars.add(digitChars[keyBytes[2].toUByte().toInt() % digitChars.length])
        passwordChars.add(symbolChars[keyBytes[3].toUByte().toInt() % symbolChars.length])

        for (i in 4 until length) {
            val byteIndex = i % keyBytes.size
            passwordChars.add(allChars[keyBytes[byteIndex].toUByte().toInt() % allChars.length])
        }

        // 2. Use a manual, portable Fisher-Yates shuffle to match the web extension.
        for (i in passwordChars.indices.reversed()) {
            val byteIndex = (length + i) % keyBytes.size
            val j = keyBytes[byteIndex].toUByte().toInt() % (i + 1)
            // Swap elements
            val temp = passwordChars[i]
            passwordChars[i] = passwordChars[j]
            passwordChars[j] = temp
        }

        return passwordChars.joinToString("")
    }

    /**
     * Generates a legacy password using the Stanford PwdHash HMAC-MD5 algorithm.
     * This matches the original pwdhash.stanford.edu implementation.
     */
    fun generateLegacyPassword(masterPassword: String, domain: String): String {
        val hash = b64HmacMd5(masterPassword, domain)
        val size = masterPassword.length + 2 // "@@" prefix length
        val nonalphanumeric = masterPassword.contains(Regex("\\W"))
        return applyConstraints(hash, size, nonalphanumeric)
    }

    /**
     * Apply Stanford PwdHash constraints to ensure password requirements.
     */
    private fun applyConstraints(hash: String, size: Int, nonalphanumeric: Boolean): String {
        val startingSize = size - 4  // Leave room for some extra characters
        var result = hash.substring(0, minOf(startingSize, hash.length))
        val extras = hash.substring(minOf(startingSize, hash.length)).toMutableList()

        // Utility functions
        fun nextExtra(): Int = if (extras.isNotEmpty()) extras.removeAt(0).code else 0
        fun nextExtraChar(): Char = nextExtra().toChar()
        fun between(min: Int, interval: Int, offset: Int): Int = min + offset % interval
        fun nextBetween(base: Char, interval: Int): Char =
            between(base.code, interval, nextExtra()).toChar()
        fun contains(regex: Regex): Boolean = result.contains(regex)

        // Add the extra characters
        result += if (contains(Regex("[A-Z]"))) nextExtraChar() else nextBetween('A', 26)
        result += if (contains(Regex("[a-z]"))) nextExtraChar() else nextBetween('a', 26)
        result += if (contains(Regex("[0-9]"))) nextExtraChar() else nextBetween('0', 10)
        result += if (contains(Regex("\\W")) && nonalphanumeric) nextExtraChar() else '+'

        while (contains(Regex("\\W")) && !nonalphanumeric) {
            result = result.replaceFirst(Regex("\\W"), nextBetween('A', 26).toString())
        }

        // Rotate the result to make it harder to guess the inserted locations
        val resultChars = result.toMutableList()
        rotate(resultChars, nextExtra())
        return resultChars.joinToString("")
    }

    /**
     * Rotate array in place.
     */
    private fun <T> rotate(list: MutableList<T>, amount: Int) {
        var count = amount
        while (count-- > 0) {
            if (list.isNotEmpty()) {
                list.add(list.removeAt(0))
            }
        }
    }

    /**
     * Compute HMAC-MD5 and return base64 encoded result.
     */
    private fun b64HmacMd5(key: String, data: String): String {
        val mac = Mac.getInstance("HmacMD5")
        val secretKey = SecretKeySpec(key.toByteArray(), "HmacMD5")
        mac.init(secretKey)
        val rawHmac = mac.doFinal(data.toByteArray())
        return Base64.encodeToString(rawHmac, Base64.NO_WRAP or Base64.NO_PADDING)
    }
}
