package com.unfilteredengineers.sachet.data

import org.junit.Assert.assertEquals
import org.junit.Test

class ScreenshotTextTest {
    @Test
    fun keepsTheMessageAndDropsPhoneAndAppChrome() {
        val lines = listOf(
            "10:45", "87%", "Today", "+91 98765 43210",
            "Dear customer, your SBI KYC is pending.",
            "Update  now: sbi-kyc.xyz", "11:02 am", "Type a message",
        )
        assertEquals(
            "+91 98765 43210\nDear customer, your SBI KYC is pending.\nUpdate now: sbi-kyc.xyz",
            cleanScreenshotText(lines),
        )
    }

    @Test
    fun keepsHindiAndDropsHindiLabels() {
        assertEquals(
            "आपका बिजली कनेक्शन आज रात 9:30 बजे काट दिया जाएगा",
            cleanScreenshotText(listOf("आज", "आपका बिजली कनेक्शन आज रात 9:30 बजे काट दिया जाएगा", "•")),
        )
    }

    @Test
    fun givesEmptyTextForAPictureWithNoMessage() {
        assertEquals("", cleanScreenshotText(listOf("9:41", "100%", "")))
    }

    @Test
    fun capsTheLength() {
        assertEquals(MAX_MESSAGE_LENGTH, cleanScreenshotText(List(500) { "word ".repeat(10) }).length)
    }
}
