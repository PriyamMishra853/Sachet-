package com.unfilteredengineers.sachet.ui

import android.net.Uri
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.activity.result.ActivityResultRegistry
import androidx.activity.result.ActivityResultRegistryOwner
import androidx.activity.result.contract.ActivityResultContract
import androidx.compose.runtime.CompositionLocalProvider
import androidx.core.app.ActivityOptionsCompat
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.unfilteredengineers.sachet.data.Band
import com.unfilteredengineers.sachet.data.CheckResult
import com.unfilteredengineers.sachet.data.Extracted
import com.unfilteredengineers.sachet.data.Stats
import com.unfilteredengineers.sachet.i18n.Lang
import com.unfilteredengineers.sachet.i18n.Text2
import com.unfilteredengineers.sachet.ui.theme.SachetTheme
import org.junit.Rule
import org.junit.Test

// Draws each screen on the computer (no phone or emulator) so a change in
// the look can be seen and reviewed. `./gradlew recordPaparazziDebug` saves
// the pictures to app/src/test/snapshots/images.
class ScreensSnapshotTest {
    // A common phone size, and a very tall one that shows a whole scrolling page.
    private val phone = DeviceConfig.PIXEL_5
    private val tall = DeviceConfig.PIXEL_5.copy(screenHeight = 9000)

    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = phone, showSystemUi = false)

    // The photo picker needs an activity; the tests have none, and never launch it.
    private val noActivityResults = object : ActivityResultRegistryOwner {
        override val activityResultRegistry = object : ActivityResultRegistry() {
            override fun <I, O> onLaunch(
                requestCode: Int,
                contract: ActivityResultContract<I, O>,
                input: I,
                options: ActivityOptionsCompat?,
            ) {}
        }
    }

    private object NoActions : SachetActions {
        override fun show(screen: Screen) {}
        override fun toggleLang() {}
        override fun setTab(tab: Tab) {}
        override fun setInput(value: String) {}
        override fun setSender(value: String) {}
        override fun runCheck() {}
        override fun checkScreenshot(uri: Uri) {}
        override fun reportChecked() {}
        override fun answerPaid(paid: Boolean) {}
        override fun editReport(change: (ReportUi) -> ReportUi) {}
        override fun sendReport() {}
        override fun deleteMyData() {}
    }

    private val highRisk = CheckResult(
        band = Band.HIGH,
        label = Text2("High risk", "उच्च जोखिम"),
        scamType = "parcel",
        reportCount = 3,
        checkId = "00000000-0000-0000-0000-000000000000",
        reasons = listOf(
            Text2("This UPI ID was reported as a scam by 3 people.", "इस UPI ID को 3 लोगों ने धोखाधड़ी बताया है।"),
            Text2("The message matches a common courier / customs parcel scam.", "यह मैसेज एक आम कूरियर / कस्टम पार्सल धोखाधड़ी से मिलता है।"),
            Text2("Pushes you to act fast", "जल्दी करने का दबाव डालता है"),
        ),
        advice = listOf(
            Text2("Don't pay, don't click the link, and don't share any OTP or PIN. Block the sender.", "पैसे न भेजें, लिंक न खोलें, और कोई OTP या PIN न बताएं। भेजने वाले को ब्लॉक करें।"),
            Text2("Lost money? Call 1930 right away or report at cybercrime.gov.in. The first hour matters most.", "पैसे गए? तुरंत 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें। पहला घंटा सबसे ज़रूरी है।"),
        ),
        extracted = Extracted(upis = listOf("customs.clear@ybl")),
    )

    private fun snap(state: UiState, device: DeviceConfig = tall) {
        paparazzi.unsafeUpdateConfig(deviceConfig = device)
        paparazzi.snapshot {
            CompositionLocalProvider(LocalActivityResultRegistryOwner provides noActivityResults) {
                SachetTheme { SachetAppContent(state, NoActions) }
            }
        }
    }

    private val stats = Stats(checks = 1240, reports = 87, moneyProtectedInr = 450000)

    /** What a person sees first when they open the app. */
    @Test
    fun homeFirstScreen() = snap(UiState(stats = stats), device = phone)

    @Test
    fun homeWholePage() = snap(UiState(stats = stats))

    @Test
    fun homeHindiFirstScreen() = snap(UiState(lang = Lang.HI), device = phone)

    @Test
    fun highRiskResult() = snap(
        UiState(
            check = CheckUi(
                input = "Your parcel is held by customs. Pay Rs 2,999 to customs.clear@ybl within 2 hours.",
                result = highRisk,
            ),
        ),
    )

    @Test
    fun report() = snap(UiState(screen = Screen.REPORT))

    @Test
    fun privacy() = snap(UiState(screen = Screen.PRIVACY))
}
