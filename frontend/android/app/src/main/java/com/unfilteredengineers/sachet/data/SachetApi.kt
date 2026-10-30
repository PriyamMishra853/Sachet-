package com.unfilteredengineers.sachet.data

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/** status 0 means the API couldn't be reached at all (no internet, timeout). */
class ApiException(val status: Int, val reason: String) : Exception(reason)

// Client for the Sachet API. The same calls the website makes, so the app
// and the site always give the same answer.
class SachetApi(
    baseUrl: String,
    private val clientId: () -> String,
    private val http: OkHttpClient = defaultClient(),
) {
    private val base: HttpUrl = baseUrl.trimEnd('/').toHttpUrl()
    private val json = Json {
        ignoreUnknownKeys = true
        // The API rejects `"scamType": null`; leave empty fields out instead.
        explicitNulls = false
    }

    suspend fun checkIdentifier(type: IdType, value: String): CheckResult {
        val url = path("v1", "check").newBuilder()
            .addQueryParameter("type", type.wire)
            .addQueryParameter("value", value)
            .build()
        return call(Request.Builder().url(url).get())
    }

    /** `sender`: what the phone shows as the SMS sender ("VM-HDFCBK-S" or a number), if known. */
    suspend fun checkMessage(text: String, sender: String? = null): CheckResult {
        val body = MessageRequest(text, sender?.trim()?.ifEmpty { null })
        return call(post(path("v1", "check", "message"), json.encodeToString(body)))
    }

    suspend fun report(body: ReportRequest, idempotencyKey: String): ReportResponse =
        call(post(path("v1", "reports"), json.encodeToString(body)).header("idempotency-key", idempotencyKey))

    suspend fun deleteMyData(): DeleteResponse = call(Request.Builder().url(path("v1", "me")).delete())

    /** Answer to "Have you already paid?" for a check this phone made. */
    suspend fun answerPaid(checkId: String, paid: Boolean) {
        val body = json.encodeToString(PaidRequest(if (paid) "yes" else "no"))
        execute(post(path("v1", "checks", checkId, "paid"), body))
    }

    suspend fun stats(): Stats = call(Request.Builder().url(path("v1", "stats")).get())

    private fun path(vararg segments: String): HttpUrl =
        base.newBuilder().apply { segments.forEach { addPathSegment(it) } }.build()

    private fun post(url: HttpUrl, body: String) =
        Request.Builder().url(url).post(body.toRequestBody(JSON_TYPE))

    private suspend inline fun <reified T> call(builder: Request.Builder): T =
        json.decodeFromString<T>(execute(builder))

    /** Sends the request and returns the body; throws ApiException on any failure. */
    private suspend fun execute(builder: Request.Builder): String = withContext(Dispatchers.IO) {
        // A random ID kept on this phone, so the API counts this person's reports once.
        val request = builder
            .header("x-client-id", clientId())
            .header("x-sachet-client", "android")
            .header("accept", "application/json")
            .build()
        val (code, text) = try {
            http.newCall(request).execute().use { it.code to it.body?.string().orEmpty() }
        } catch (e: IOException) {
            throw ApiException(0, "offline")
        }
        if (code !in 200..299) {
            val reason = runCatching { json.decodeFromString<ErrorBody>(text).reason }.getOrNull()
            throw ApiException(code, reason ?: "HTTP $code")
        }
        text
    }

    companion object {
        private val JSON_TYPE = "application/json".toMediaType()

        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .callTimeout(20, TimeUnit.SECONDS)
            // Never follow a redirect from https down to plain http.
            .followSslRedirects(false)
            .build()
    }
}
