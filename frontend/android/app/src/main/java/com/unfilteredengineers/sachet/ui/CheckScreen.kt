package com.unfilteredengineers.sachet.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab as TabItem
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.unfilteredengineers.sachet.data.Band
import com.unfilteredengineers.sachet.data.CheckResult
import com.unfilteredengineers.sachet.i18n.Lang
import com.unfilteredengineers.sachet.i18n.SCAM_TYPE_NAMES
import com.unfilteredengineers.sachet.i18n.T
import com.unfilteredengineers.sachet.i18n.Text2
import com.unfilteredengineers.sachet.ui.theme.bandColors
import com.unfilteredengineers.sachet.ui.theme.okColor

private data class TabInfo(val tab: Tab, val label: Text2, val placeholder: Text2, val keyboard: KeyboardType)

private val TABS = listOf(
    TabInfo(Tab.MESSAGE, T.tabMessage, T.phMessage, KeyboardType.Text),
    TabInfo(Tab.PHONE, T.tabPhone, T.phPhone, KeyboardType.Phone),
    TabInfo(Tab.UPI, T.tabUpi, T.phUpi, KeyboardType.Email),
    TabInfo(Tab.URL, T.tabUrl, T.phUrl, KeyboardType.Uri),
)

@Composable
fun CheckScreen(state: UiState, vm: SachetViewModel, padding: PaddingValues) {
    val lang = state.lang
    val c = state.check
    val current = TABS.first { it.tab == c.tab }

    Page(padding) {
        Text(T.checkTitle.of(lang), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            T.checkIntro.of(lang),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )

        TabRow(selectedTabIndex = TABS.indexOf(current)) {
            for (t in TABS) {
                TabItem(
                    selected = t.tab == c.tab,
                    onClick = { vm.setTab(t.tab) },
                    text = { Text(t.label.of(lang), maxLines = 1) },
                )
            }
        }

        val isMessage = c.tab == Tab.MESSAGE
        OutlinedTextField(
            value = c.input,
            onValueChange = vm::setInput,
            placeholder = { Text(current.placeholder.of(lang)) },
            singleLine = !isMessage,
            minLines = if (isMessage) 5 else 1,
            keyboardOptions = KeyboardOptions(
                keyboardType = current.keyboard,
                // Phone numbers, UPI IDs and links must not be "corrected".
                autoCorrectEnabled = isMessage,
                imeAction = if (isMessage) ImeAction.Default else ImeAction.Search,
            ),
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )

        if (isMessage) {
            OutlinedTextField(
                value = c.sender,
                onValueChange = vm::setSender,
                label = { Text(T.senderLabel.of(lang)) },
                placeholder = { Text(T.senderPlaceholder.of(lang)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Characters,
                    autoCorrectEnabled = false,
                ),
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
        }

        Button(
            onClick = vm::runCheck,
            enabled = !c.loading && c.input.isNotBlank(),
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        ) {
            if (c.loading) {
                CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
                Text(T.checking.of(lang))
            } else {
                Text(T.checkButton.of(lang))
            }
        }

        c.error?.let {
            Text(it.of(lang), color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }

        c.result?.let { ResultCard(it, c.reportState, lang, onReport = vm::reportChecked) }

        if (c.result == null) {
            Text(
                T.shareTip.of(lang),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 16.dp),
            )
        }

        HelplineCard(lang)
    }
}

private val BAND_ICON = mapOf(Band.HIGH to "🔴", Band.MEDIUM to "🟠", Band.LOW to "🟡", Band.UNKNOWN to "⚪")

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ResultCard(result: CheckResult, reportState: SendState, lang: Lang, onReport: () -> Unit) {
    val colors = bandColors(result.band)
    val found = result.extracted?.let { it.phones + it.upis + it.domains }.orEmpty()

    Card(
        colors = CardDefaults.cardColors(containerColor = colors.background),
        // Screen readers announce the verdict as soon as it appears.
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                "${BAND_ICON[result.band]} ${result.label.of(lang)}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = colors.ink,
            )
            result.scamType?.let { SCAM_TYPE_NAMES[it] }?.let {
                Text(it.of(lang), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 2.dp))
            }
            result.sender?.let { s ->
                Text(
                    "${T.sender.of(lang)}: ${s.label.of(lang)}",
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 8.dp),
                )
                Text(
                    s.note.of(lang),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (result.reportCount > 0) {
                Text(
                    "${T.reportedBy.of(lang)}: ${result.reportCount}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Heading(T.why.of(lang))
            Bullets(result.reasons.map { it.of(lang) })

            if (found.isNotEmpty()) {
                Heading(T.found.of(lang))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (f in found) {
                        Surface(shape = MaterialTheme.shapes.small, color = MaterialTheme.colorScheme.surface) {
                            Text(f, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }
            }

            Heading(T.whatToDo.of(lang))
            Bullets(result.advice.map { it.of(lang) })

            Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                when (reportState) {
                    SendState.DONE, SendState.DUPLICATE -> Text(
                        (if (reportState == SendState.DONE) T.reportThanks else T.reportDuplicate).of(lang),
                        color = okColor(),
                    )
                    else -> OutlinedButton(onClick = onReport, enabled = reportState != SendState.SENDING) {
                        Text(T.reportThis.of(lang))
                    }
                }
            }
            if (reportState == SendState.ERROR) {
                Text(T.errorGeneric.of(lang), color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun Heading(text: String) {
    Text(text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
}

@Composable
private fun Bullets(items: List<String>) {
    for (item in items) {
        Row(Modifier.padding(vertical = 2.dp)) {
            Text("•  ")
            Text(item)
        }
    }
}
