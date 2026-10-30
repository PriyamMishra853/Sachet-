package com.unfilteredengineers.sachet.data

// Text read from a screenshot comes with the phone's status bar and the chat
// app's buttons around the message. This keeps the message and drops lines
// that are only a clock, a battery level, a date heading or a button label.

private val CLOCK = Regex("""^\d{1,2}[:.]\d{2}(\s?[ap]\.?m\.?)?$""", RegexOption.IGNORE_CASE)
private val PERCENT = Regex("""^\d{1,3}\s?%$""")
private val UI_LABELS = setOf(
    "today", "yesterday", "type a message", "message", "reply", "send", "online",
    "आज", "कल", "मैसेज लिखें",
)

fun cleanScreenshotText(lines: List<String>): String =
    lines.asSequence()
        .map { it.replace(Regex("""\s+"""), " ").trim() }
        .filter { line ->
            line.length >= 2 &&
                !CLOCK.matches(line) &&
                !PERCENT.matches(line) &&
                line.lowercase() !in UI_LABELS
        }
        .joinToString("\n")
        .take(MAX_MESSAGE_LENGTH)
