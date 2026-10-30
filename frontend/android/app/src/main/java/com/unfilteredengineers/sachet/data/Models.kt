package com.unfilteredengineers.sachet.data

import com.unfilteredengineers.sachet.i18n.Text2
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// The JSON the Sachet API sends and accepts (see the API table in README.md).

@Serializable
enum class Band {
    @SerialName("unknown") UNKNOWN,
    @SerialName("low") LOW,
    @SerialName("medium") MEDIUM,
    @SerialName("high") HIGH,
}

enum class IdType(val wire: String) { PHONE("phone"), UPI("upi"), URL("url") }

@Serializable
data class Identifier(val kind: String, val value: String)

@Serializable
data class Extracted(
    val phones: List<String> = emptyList(),
    val upis: List<String> = emptyList(),
    val domains: List<String> = emptyList(),
    val amounts: List<Double> = emptyList(),
)

/** Who sent the SMS (when the user typed it). Information only: never a clean chit. */
@Serializable
data class SenderInfo(val kind: String, val value: String, val label: Text2, val note: Text2) {
    val isPhoneNumber: Boolean get() = kind == "mobile" || kind == "international"
}

@Serializable
data class CheckResult(
    val band: Band,
    val label: Text2,
    val scamType: String? = null,
    val reasons: List<Text2> = emptyList(),
    val advice: List<Text2> = emptyList(),
    val reportCount: Int = 0,
    val checkId: String? = null,
    val identifier: Identifier? = null,
    val extracted: Extracted? = null,
    val sender: SenderInfo? = null,
)

@Serializable
data class MessageRequest(val text: String, val sender: String? = null)

@Serializable
data class IdentifierInput(val type: String, val value: String)

@Serializable
data class ReportRequest(
    val identifiers: List<IdentifierInput>? = null,
    val text: String? = null,
    val scamType: String? = null,
    val amountInr: Long? = null,
)

@Serializable
data class ReportResponse(val reportId: String? = null, val duplicate: Boolean)

@Serializable
data class DeleteResponse(val reports: Int, val checks: Int)

@Serializable
data class PaidRequest(val paid: String)

@Serializable
data class Stats(val checks: Long = 0, val reports: Long = 0, val moneyProtectedInr: Long = 0)

@Serializable
data class ErrorBody(val error: String? = null, val reason: String? = null)
