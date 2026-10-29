package com.unfilteredengineers.sachet.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.unfilteredengineers.sachet.i18n.Lang
import com.unfilteredengineers.sachet.i18n.T

// The app shell: title bar with the language switch, the current screen, and
// the bottom bar to move between Check, Report and Privacy.
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SachetApp(vm: SachetViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val lang = state.lang

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Sachet", fontWeight = FontWeight.Bold)
                        Text(
                            T.tagline.of(lang),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    TextButton(onClick = vm::toggleLang) {
                        Text(if (lang == Lang.EN) "हिंदी" else "English")
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                val items = listOf(
                    Triple(Screen.CHECK, Icons.Filled.Search, T.navCheck),
                    Triple(Screen.REPORT, Icons.Filled.Warning, T.navReport),
                    Triple(Screen.PRIVACY, Icons.Filled.Lock, T.navPrivacy),
                )
                for ((screen, icon, label) in items) {
                    NavigationBarItem(
                        selected = state.screen == screen,
                        onClick = { vm.show(screen) },
                        icon = { Icon(icon, contentDescription = null) },
                        label = { Text(label.of(lang)) },
                    )
                }
            }
        },
    ) { padding ->
        when (state.screen) {
            Screen.CHECK -> CheckScreen(state, vm, padding)
            Screen.REPORT -> ReportScreen(state, vm, padding)
            Screen.PRIVACY -> PrivacyScreen(state, vm, padding)
        }
    }
}

/** A scrolling page with the standard side margins. */
@Composable
fun Page(padding: PaddingValues, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        content = content,
    )
}

/** "Lost money? Call 1930" with buttons that open the dialer and the cybercrime portal. */
@Composable
fun HelplineCard(lang: Lang) {
    val context = LocalContext.current
    Card(
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(T.lostMoney.of(lang), fontWeight = FontWeight.SemiBold)
            Row(Modifier.padding(top = 8.dp)) {
                // ACTION_DIAL only fills in the number; the person still taps call.
                // So the app needs no phone permission.
                OutlinedButton(onClick = { context.open(Intent(Intent.ACTION_DIAL, Uri.parse("tel:1930"))) }) {
                    Text(T.call1930.of(lang))
                }
                Spacer(Modifier.width(8.dp))
                OutlinedButton(onClick = {
                    context.open(Intent(Intent.ACTION_VIEW, Uri.parse("https://cybercrime.gov.in")))
                }) {
                    Text(T.openCybercrime.of(lang))
                }
            }
        }
    }
}

private fun Context.open(intent: Intent) {
    try {
        startActivity(intent)
    } catch (_: ActivityNotFoundException) {
        // No dialer or browser (some tablets): nothing to open.
    }
}
