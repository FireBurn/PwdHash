package uk.co.fireburn.pwdhash

import java.io.File
import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Checks the app against tests/domain-vectors.txt, which the extension and the website are held to
 * as well. The legacy answers in that file come from the original PwdHash implementation, so a
 * failure in the legacy cases means this app would salt with a domain the original never used.
 */
class DomainExtractorTest {

    @Before
    fun loadPinnedPublicSuffixList() {
        DomainExtractor.setPublicSuffixRules(
            repositoryFile("Android/app/src/main/assets/${DomainExtractor.PUBLIC_SUFFIX_LIST_ASSET}")
                .readText()
        )
    }

    @Test
    fun `domain extraction matches the shared vectors`() {
        val lines = repositoryFile("tests/domain-vectors.txt").readLines()
            .filter { it.isNotBlank() && !it.startsWith("#") }
        assertTrue("No domain vectors found", lines.isNotEmpty())

        for (line in lines) {
            val (input, legacy, modern) = line.split(" ").map(::decode)
            assertEquals("legacy: $input", legacy, DomainExtractor.extractLegacyDomain(input))
            assertEquals(
                "modern: $input",
                modern,
                DomainExtractor.extractModernDomain(DomainExtractor.hostFromInput(input))
            )
        }
    }

    @Test
    fun `the pinned public suffix list is the same one the other platforms use`() {
        assertEquals(
            repositoryFile("Chrome/src/data/public-suffix-list.txt").readText(),
            repositoryFile("Android/app/src/main/assets/public-suffix-list.txt").readText()
        )
    }

    private fun decode(value: String) = String(Base64.getDecoder().decode(value), Charsets.UTF_8)

    /** Unit tests run from the module directory, so walk up to the repository root. */
    private fun repositoryFile(path: String): File {
        var directory: File? = File("").absoluteFile
        while (directory != null) {
            val candidate = File(directory, path)
            if (candidate.isFile) return candidate
            directory = directory.parentFile
        }
        throw IllegalStateException("Could not find $path above ${File("").absolutePath}")
    }
}
