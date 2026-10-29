package com.unfilteredengineers.sachet.data

import org.junit.Assert.assertEquals
import org.junit.Test

class InputTest {
    @Test
    fun `guesses the identifier type like the website does`() {
        assertEquals(IdType.UPI, guessType("customs.clear@ybl"))
        assertEquals(IdType.PHONE, guessType("+91 98765-43210"))
        assertEquals(IdType.PHONE, guessType("9876543210"))
        assertEquals(IdType.URL, guessType("bit.ly/abc"))
        assertEquals(IdType.URL, guessType("https://sbi-kyc-update.xyz/login"))
    }

    @Test
    fun `joins a shared subject and text without repeating them`() {
        assertEquals("Pay now", combineShared(null, "  Pay now  "))
        // Chrome: page title as subject, link as text.
        assertEquals("SBI KYC\nhttps://x.xyz", combineShared("SBI KYC", "https://x.xyz"))
        // Subject that is just the start of the text is dropped.
        assertEquals("Win ₹5 lakh today", combineShared("Win ₹5 lakh", "Win ₹5 lakh today"))
        assertEquals("", combineShared(" ", null))
    }

    @Test
    fun `cuts shared text to the API's 4000-character limit`() {
        assertEquals(MAX_MESSAGE_LENGTH, combineShared(null, "a".repeat(5000)).length)
    }
}
