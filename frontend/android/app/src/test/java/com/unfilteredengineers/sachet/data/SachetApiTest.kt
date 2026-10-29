package com.unfilteredengineers.sachet.data

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// The API client against a fake server that answers like the real Sachet API.
class SachetApiTest {
    private val server = MockWebServer()
    private val clientId = "3f1c2b7a-9d4e-4c1a-8b2f-5e6d7c8b9a01"
    private lateinit var api: SachetApi

    @Before
    fun setUp() {
        server.start()
        api = SachetApi(server.url("/").toString(), clientId = { clientId })
    }

    @After
    fun tearDown() = server.shutdown()

    private fun json(code: Int, body: String) =
        MockResponse().setResponseCode(code).setHeader("content-type", "application/json").setBody(body)

    @Test
    fun `reads a message verdict, ignoring fields it doesn't know`() = runTest {
        server.enqueue(
            json(
                200,
                """
                {"band":"high","label":{"en":"High risk","hi":"उच्च जोखिम"},"scamType":"parcel",
                 "reasons":[{"en":"Looks like a parcel scam","hi":"पार्सल धोखाधड़ी जैसा"}],
                 "advice":[{"en":"Call 1930","hi":"1930 पर कॉल करें"}],"reportCount":0,
                 "signals":["payment_demand"],
                 "extracted":{"phones":[],"upis":["customs.clear@ybl"],"domains":[],"amounts":[2999]},
                 "checkId":"0b6f1c9e-1d2a-4c3b-9e8f-7a6b5c4d3e2f"}
                """.trimIndent(),
            ),
        )
        val r = api.checkMessage("Pay ₹2,999 to customs.clear@ybl")
        assertEquals(Band.HIGH, r.band)
        assertEquals("उच्च जोखिम", r.label.hi)
        assertEquals(listOf("customs.clear@ybl"), r.extracted?.upis)
        assertEquals(listOf(2999.0), r.extracted?.amounts)

        val req = server.takeRequest()
        assertEquals("POST", req.method)
        assertEquals("/v1/check/message", req.path)
        assertEquals(clientId, req.getHeader("x-client-id"))
        assertEquals("""{"text":"Pay ₹2,999 to customs.clear@ybl"}""", req.body.readUtf8())
    }

    @Test
    fun `sends the SMS sender and reads its label`() = runTest {
        server.enqueue(
            json(
                200,
                """
                {"band":"high","label":{"en":"High risk","hi":"उच्च जोखिम"},
                 "sender":{"kind":"mobile","value":"+919876543210",
                           "label":{"en":"An ordinary mobile number","hi":"एक आम मोबाइल नंबर"},
                           "note":{"en":"Banks use registered names.","hi":"बैंक रजिस्टर्ड नाम इस्तेमाल करते हैं।"}}}
                """.trimIndent(),
            ),
        )
        val r = api.checkMessage("Your SBI KYC is pending", sender = " 98765 43210 ")
        assertEquals("mobile", r.sender?.kind)
        assertTrue(r.sender!!.isPhoneNumber)
        assertEquals(
            """{"text":"Your SBI KYC is pending","sender":"98765 43210"}""",
            server.takeRequest().body.readUtf8(),
        )
    }

    @Test
    fun `leaves out an empty sender`() = runTest {
        server.enqueue(json(200, """{"band":"unknown","label":{"en":"No reports yet","hi":"अभी तक कोई शिकायत नहीं"}}"""))
        api.checkMessage("hello", sender = "  ")
        assertEquals("""{"text":"hello"}""", server.takeRequest().body.readUtf8())
    }

    @Test
    fun `encodes the identifier safely in the query`() = runTest {
        server.enqueue(json(200, """{"band":"unknown","label":{"en":"No reports yet","hi":"अभी तक कोई शिकायत नहीं"}}"""))
        api.checkIdentifier(IdType.PHONE, "+91 98765&x=1")
        val req = server.takeRequest()
        assertEquals("/v1/check?type=phone&value=%2B91%2098765%26x%3D1", req.path)
    }

    @Test
    fun `sends the idempotency key and leaves empty fields out of a report`() = runTest {
        server.enqueue(json(202, """{"reportId":"r1","duplicate":false}"""))
        val res = api.report(
            ReportRequest(identifiers = listOf(IdentifierInput("upi", "a.b@ybl"))),
            idempotencyKey = "key-0001-abcd",
        )
        assertFalse(res.duplicate)
        val req = server.takeRequest()
        assertEquals("key-0001-abcd", req.getHeader("idempotency-key"))
        // No "text":null or "scamType":null: the API would reject them.
        assertEquals("""{"identifiers":[{"type":"upi","value":"a.b@ybl"}]}""", req.body.readUtf8())
    }

    @Test
    fun `turns an API error into its reason`() = runTest {
        server.enqueue(json(400, """{"error":"bad_request","reason":"Could not read \"x\" as a phone"}"""))
        val err = runCatching { api.checkIdentifier(IdType.PHONE, "x") }.exceptionOrNull() as ApiException
        assertEquals(400, err.status)
        assertEquals("Could not read \"x\" as a phone", err.reason)
    }

    @Test
    fun `reports status 0 when the server can't be reached`() = runTest {
        server.shutdown()
        val err = runCatching { api.deleteMyData() }.exceptionOrNull()
        assertTrue(err is ApiException && err.status == 0)
    }
}
