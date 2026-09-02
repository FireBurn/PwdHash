package uk.co.fireburn.pwdhash

import java.io.File
import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Checks the app against tests/vectors.txt, the vectors shared with the extension and the website.
 * Legacy expectations in that file are produced by running the original PwdHash implementation, so
 * a failure here means this app would generate a password the original never would.
 */
class CrossPlatformVectorsTest {

    private data class Vector(
        val kind: String,
        val masterPassword: String,
        val domain: String,
        val expected: String
    )

    @Test
    fun `legacy passwords match the shared vectors`() {
        val vectors = readVectors("legacy")
        assertTrue("No legacy vectors found", vectors.isNotEmpty())
        for (vector in vectors) {
            assertEquals(
                describe(vector),
                vector.expected,
                PasswordGenerator.generateLegacyPassword(vector.masterPassword, vector.domain)
            )
        }
    }

    @Test
    fun `modern passwords match the shared vectors`() {
        val vectors = readVectors("modern")
        assertTrue("No modern vectors found", vectors.isNotEmpty())
        for (vector in vectors) {
            assertEquals(
                describe(vector),
                vector.expected,
                PasswordGenerator.generateSecurePassword(vector.masterPassword, vector.domain)
            )
        }
    }

    private fun describe(vector: Vector) =
        "${vector.kind}: ${vector.masterPassword.length} char master password @ ${vector.domain}"

    private fun readVectors(kind: String): List<Vector> = vectorsFile().readLines()
        .filter { it.isNotBlank() && !it.startsWith("#") }
        .map { line ->
            val (lineKind, master, domain, expected) = line.split(" ")
            Vector(lineKind, decode(master), decode(domain), decode(expected))
        }
        .filter { it.kind == kind }

    private fun decode(value: String) = String(Base64.getDecoder().decode(value), Charsets.UTF_8)

    /** Unit tests run from the module directory, so walk up to the repository root to find them. */
    private fun vectorsFile(): File {
        var directory: File? = File("").absoluteFile
        while (directory != null) {
            val candidate = File(directory, "tests/vectors.txt")
            if (candidate.isFile) return candidate
            directory = directory.parentFile
        }
        throw IllegalStateException(
            "Could not find tests/vectors.txt above ${File("").absolutePath}"
        )
    }
}
