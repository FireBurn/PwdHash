package uk.co.fireburn.pwdhash

import java.net.URL
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
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
}
