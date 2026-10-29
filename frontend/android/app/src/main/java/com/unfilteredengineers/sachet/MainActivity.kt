package com.unfilteredengineers.sachet

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
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

    // Another app's Share menu sends plain text here. Treat it as untrusted
    // input: it is only ever shown as text and sent to the API to be checked.
    private fun handleShare(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") return
        val text = combineShared(
            subject = intent.getStringExtra(Intent.EXTRA_SUBJECT),
            text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString(),
        )
        vm.checkShared(text)
    }
}
