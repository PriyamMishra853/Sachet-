package com.unfilteredengineers.sachet.data

// The API's message limit.
const val MAX_MESSAGE_LENGTH = 4000

private val UPI = Regex("^[^\\s@]+@[a-z][a-z0-9]+$", RegexOption.IGNORE_CASE)
private val PHONE = Regex("^[+\\d][\\d\\s().-]{7,}$")

/** Guesses whether a typed value is a phone number, UPI ID or link (same rules as the website). */
fun guessType(value: String): IdType {
    val v = value.trim()
    return when {
        UPI.matches(v) -> IdType.UPI
        PHONE.matches(v) -> IdType.PHONE
        else -> IdType.URL
    }
}

// Apps share in different ways: WhatsApp puts the message in the text, Chrome
// puts the page name in the subject and the link in the text, some repeat the
// link. This joins the parts into one message, without repeats.
fun combineShared(subject: String?, text: String?): String {
    val parts = mutableListOf<String>()
    for (raw in listOf(subject, text)) {
        val part = raw?.trim().orEmpty()
        if (part.isEmpty()) continue
        if (parts.any { it.contains(part) }) continue
        parts.removeAll { part.contains(it) }
        parts.add(part)
    }
    return parts.joinToString("\n").take(MAX_MESSAGE_LENGTH)
}
