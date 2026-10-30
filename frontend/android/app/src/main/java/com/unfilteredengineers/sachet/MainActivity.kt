package com.unfilteredengineers.sachet

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.content.IntentCompat
import com.unfilteredengineers.sachet.data.combineShared
import com.unfilteredengineers.sachet.ui.SachetApp
import com.unfilteredengineers.sachet.ui.SachetViewModel
import com.unfilteredengineers.sachet.ui.theme.SachetTheme

class MainActivity : ComponentActivity() {
    private val vm: SachetViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Only on a fresh start: after a screen rotation the shared message was already checked.
        if (savedInstanceState == null) handleShare(intent)
        setContent {
            SachetTheme { SachetApp(vm) }
        }
    }

    // Sachet already open, and the person shares another message to it.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShare(intent)
    }

    // Another app's Share menu sends plain text or a picture here. Treat both
    // as untrusted input: text is only ever shown and sent to the API to be
    // checked; a picture is only read for its text, on the phone.
    private fun handleShare(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND) return
        val type = intent.type ?: return
        when {
            type == "text/plain" -> vm.checkShared(
                combineShared(
                    subject = intent.getStringExtra(Intent.EXTRA_SUBJECT),
                    text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString(),
                ),
            )
            type.startsWith("image/") ->
                IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
                    ?.let(vm::checkScreenshot)
        }
    }
}
