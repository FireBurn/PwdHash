package uk.co.fireburn.pwdhash

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PasswordGeneratorTest {

    @Test
    fun `site extraction retains the established full URL behavior`() {
        assertEquals(
            "example.co.uk",
            PasswordGenerator.getSite("https://login.example.co.uk/account")
        )
    }

    @Test
    fun `modern generator matches the shared cross-platform vector`() {
        assertEquals(
            "7e!CL_EcvqAo=es_",
            PasswordGenerator.generateSecurePassword(
                masterPassword = "correct horse battery staple",
                domain = "example.com"
            )
        )
    }

    @Test
    fun `legacy generator handles a one-character master password`() {
        val password = PasswordGenerator.generateLegacyPassword("a", "example.com")

        assertTrue(password.isNotEmpty())
    }
}
