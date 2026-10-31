package com.unfilteredengineers.sachet.ui

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
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
import com.unfilteredengineers.sachet.data.Stats
import com.unfilteredengineers.sachet.i18n.Lang
import com.unfilteredengineers.sachet.i18n.SCAM_TYPE_HINTS
import com.unfilteredengineers.sachet.i18n.SCAM_TYPE_NAMES
import com.unfilteredengineers.sachet.i18n.T
import com.unfilteredengineers.sachet.i18n.Text2
import com.unfilteredengineers.sachet.ui.theme.Brand
import com.unfilteredengineers.sachet.ui.theme.ButtonShape
import com.unfilteredengineers.sachet.ui.theme.Danger
import com.unfilteredengineers.sachet.ui.theme.SoftBackground
import com.unfilteredengineers.sachet.ui.theme.bandColors
import com.unfilteredengineers.sachet.ui.theme.okColor
import java.text.NumberFormat
import java.util.Locale

private data class TabInfo(
    val tab: Tab,
    val label: Text2,
    val field: Text2,
    val placeholder: Text2,
    val keyboard: KeyboardType,
)

private val TABS = listOf(
    TabInfo(Tab.MESSAGE, T.tabMessage, T.fieldMessage, T.phMessage, KeyboardType.Text),
    TabInfo(Tab.PHONE, T.tabPhone, T.fieldPhone, T.phPhone, KeyboardType.Phone),
    TabInfo(Tab.UPI, T.tabUpi, T.fieldUpi, T.phUpi, KeyboardType.Email),
    TabInfo(Tab.URL, T.tabUrl, T.fieldUrl, T.phUrl, KeyboardType.Uri),
)

@Composable
fun CheckScreen(state: UiState, vm: SachetActions, padding: PaddingValues) {
    val lang = state.lang
    val c = state.check
    val current = TABS.first { it.tab == c.tab }
    val keyboard = LocalSoftwareKeyboardController.current
    var senderOpen by rememberSaveable { mutableStateOf(false) }
    // Android's photo picker: no permission to read the gallery is needed.
    val pickScreenshot = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let(vm::checkScreenshot)
    }

    Page(padding) {
        Text(
            T.heroEyebrow.of(lang),
            color = MaterialTheme.colorScheme.primary,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            T.heroTitle.of(lang),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 8.dp),
        )
        Text(
            T.heroLead.of(lang),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 10.dp, bottom = 20.dp),
        )

        Panel {
            Text(T.formQuestion.of(lang), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            TypePicker(c.tab, lang, vm::setTab)

            val isMessage = c.tab == Tab.MESSAGE
            Text(
                current.field.of(lang),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 16.dp, bottom = 6.dp),
            )
            OutlinedTextField(
                value = c.input,
                onValueChange = vm::setInput,
                placeholder = { Text(current.placeholder.of(lang)) },
                singleLine = !isMessage,
                minLines = if (isMessage) 5 else 1,
                shape = MaterialTheme.shapes.small,
                keyboardOptions = KeyboardOptions(
                    keyboardType = current.keyboard,
                    // Phone numbers, UPI IDs and links must not be "corrected".
                    autoCorrectEnabled = isMessage,
                    imeAction = if (isMessage) ImeAction.Default else ImeAction.Search,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            if (isMessage) {
                TextButton(
                    onClick = { senderOpen = !senderOpen },
                    contentPadding = PaddingValues(horizontal = 0.dp, vertical = 4.dp),
                    modifier = Modifier.padding(top = 4.dp),
                ) {
                    Text((if (senderOpen) "▾ " else "▸ ") + T.senderToggle.of(lang), fontWeight = FontWeight.SemiBold)
                }
                if (senderOpen || c.sender.isNotBlank()) {
                    Text(T.senderLabel.of(lang), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(
                        value = c.sender,
                        onValueChange = vm::setSender,
                        placeholder = { Text(T.senderPlaceholder.of(lang)) },
                        singleLine = true,
                        shape = MaterialTheme.shapes.small,
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Characters,
                            autoCorrectEnabled = false,
                        ),
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    )
                    Text(
                        T.senderHelp.of(lang),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp, bottom = 4.dp),
                    )
                }
            }

            Button(
                onClick = {
                    keyboard?.hide()
                    vm.runCheck()
                },
                enabled = !c.loading && c.input.isNotBlank(),
                shape = ButtonShape,
                // Faded navy while empty or busy, like the website, not Material's grey.
                colors = ButtonDefaults.buttonColors(
                    disabledContainerColor = Brand.copy(alpha = 0.4f),
                    disabledContentColor = Color.White,
                ),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 14.dp),
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            ) {
                if (c.loading) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                    Spacer(Modifier.width(10.dp))
                    Text((if (c.reading) T.readingScreenshot else T.checking).of(lang), fontWeight = FontWeight.SemiBold)
                } else {
                    Text(T.checkButton.of(lang), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                }
            }

            if (isMessage) {
                PlainButton(
                    T.screenshotButton.of(lang),
                    onClick = {
                        pickScreenshot.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    },
                    enabled = !c.loading,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
                Text(
                    T.screenshotNote.of(lang),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }

            c.error?.let {
                Text(it.of(lang), color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 10.dp))
            }
        }

        c.result?.let {
            ResultCard(it, c.reportState, c.paid, lang, onReport = vm::reportChecked, onPaid = vm::answerPaid)
        }

        TrustList(lang)

        Text(
            T.shareTip.of(lang),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 16.dp),
        )

        SectionTitle(T.scamsTitle.of(lang))
        Text(T.scamsLead.of(lang), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 12.dp))
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            for ((id, name) in SCAM_TYPE_NAMES) {
                Panel {
                    Text(name.of(lang), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    SCAM_TYPE_HINTS[id]?.let {
                        Text(it.of(lang), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }

        state.stats?.takeIf { it.checks > 0 }?.let { ImpactStats(it, lang) }

        HelplineCard(lang)
    }
}

/** "What do you want to check?": four choices in a 2 × 2 grid, the chosen one filled navy. */
@Composable
private fun TypePicker(selected: Tab, lang: Lang, onSelect: (Tab) -> Unit) {
    val line = MaterialTheme.colorScheme.outline
    Column(
        Modifier
            .padding(top = 12.dp)
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.small)
            .border(1.dp, line, MaterialTheme.shapes.small)
            .selectableGroup(),
    ) {
        TABS.chunked(2).forEachIndexed { row, pair ->
            if (row > 0) HorizontalDivider(color = line)
            Row(Modifier.height(IntrinsicSize.Min)) {
                pair.forEachIndexed { i, t ->
                    if (i > 0) VerticalDivider(color = line)
                    val isSelected = t.tab == selected
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .background(if (isSelected) Brand else MaterialTheme.colorScheme.surface)
                            .selectable(selected = isSelected, role = Role.Tab, onClick = { onSelect(t.tab) })
                            .padding(vertical = 13.dp, horizontal = 6.dp),
                    ) {
                        Text(
                            t.label.of(lang),
                            color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TrustList(lang: Lang) {
    Column(Modifier.padding(top = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        for (line in listOf(T.trustNever, T.trustNotKept, T.trustPeople)) {
            Row {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(26.dp).clip(CircleShape).background(Color(0xFFECFDF3)),
                ) {
                    Icon(Icons.Filled.Check, contentDescription = null, tint = okColor(), modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.width(12.dp))
                Text(line.of(lang))
            }
        }
    }
}

// Indian digit grouping: 1,00,000 not 100,000.
private val INR = NumberFormat.getInstance(Locale("en", "IN"))

@Composable
private fun ImpactStats(s: Stats, lang: Lang) {
    val items = buildList {
        add(INR.format(s.checks) to T.statsChecks)
        add(INR.format(s.reports) to T.statsReports)
        if (s.moneyProtectedInr > 0) add("₹${INR.format(s.moneyProtectedInr)}" to T.statsProtected)
    }
    SectionTitle(T.statsTitle.of(lang))
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        for ((value, label) in items) {
            Row(Modifier.height(IntrinsicSize.Min)) {
                Box(Modifier.width(3.dp).fillMaxHeight().background(Brand))
                Column(Modifier.padding(start = 14.dp)) {
                    Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Brand)
                    Text(label.of(lang), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

private val BAND_SUB = mapOf(
    Band.HIGH to T.bandSubHigh,
    Band.MEDIUM to T.bandSubMedium,
    Band.LOW to T.bandSubLow,
    Band.UNKNOWN to T.bandSubUnknown,
)

@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
private fun ResultCard(
    result: CheckResult,
    reportState: SendState,
    paid: Boolean?,
    lang: Lang,
    onReport: () -> Unit,
    onPaid: (Boolean) -> Unit,
) {
    val colors = bandColors(result.band)
    val found = result.extracted?.let { it.phones + it.upis + it.domains }.orEmpty()
    // The answer appears below the form, often out of sight: scroll it up.
    val bringIntoView = remember { BringIntoViewRequester() }
    LaunchedEffect(result) { bringIntoView.bringIntoView() }

    Surface(
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, colors.border),
        color = MaterialTheme.colorScheme.surface,
        // Screen readers announce the verdict as soon as it appears.
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp)
            .bringIntoViewRequester(bringIntoView)
            .semantics { liveRegion = LiveRegionMode.Polite },
    ) {
        Column {
            Row(Modifier.fillMaxWidth().background(colors.background).padding(18.dp)) {
                Icon(
                    if (result.band == Band.HIGH || result.band == Band.MEDIUM) Icons.Outlined.Warning else Icons.Outlined.Info,
                    contentDescription = null,
                    tint = colors.ink,
                    modifier = Modifier.size(28.dp),
                )
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        result.label.of(lang),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = colors.ink,
                    )
                    Text(BAND_SUB.getValue(result.band).of(lang), fontWeight = FontWeight.Medium)
                }
            }
            HorizontalDivider(color = colors.border)

            Column(Modifier.padding(start = 18.dp, end = 18.dp, bottom = 18.dp)) {
                val type = result.scamType?.let { SCAM_TYPE_NAMES[it] }
                if (type != null || result.reportCount > 0) {
                    Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                        type?.let { Fact(T.scamTypeLabel.of(lang), it.of(lang)) }
                        if (result.reportCount > 0) Fact(T.reportedBy.of(lang), result.reportCount.toString())
                    }
                }

                Heading(T.whatToDo.of(lang))
                Bullets(result.advice.map { it.of(lang) })

                Heading(T.why.of(lang))
                Bullets(result.reasons.map { it.of(lang) })

                result.sender?.let { s ->
                    Heading(T.sender.of(lang))
                    Text(s.label.of(lang), fontWeight = FontWeight.SemiBold)
                    Text(s.note.of(lang), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                if (found.isNotEmpty()) {
                    Heading(T.found.of(lang))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (f in found) {
                            Surface(shape = MaterialTheme.shapes.extraSmall, color = SoftBackground) {
                                Text(f, fontFamily = FontFamily.Monospace, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                            }
                        }
                    }
                }

                if (result.checkId != null && (result.band == Band.HIGH || result.band == Band.MEDIUM)) {
                    PaidQuestion(paid, lang, onPaid)
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.padding(top = 18.dp, bottom = 14.dp))
                when (reportState) {
                    SendState.DONE, SendState.DUPLICATE -> Text(
                        (if (reportState == SendState.DONE) T.reportThanks else T.reportDuplicate).of(lang),
                        color = okColor(),
                        fontWeight = FontWeight.SemiBold,
                    )
                    else -> PlainButton(T.reportThis.of(lang), onClick = onReport, enabled = reportState != SendState.SENDING)
                }
                if (reportState == SendState.ERROR) {
                    Text(T.errorGeneric.of(lang), color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
    }
}

@Composable
private fun Fact(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun PaidQuestion(paid: Boolean?, lang: Lang, onPaid: (Boolean) -> Unit) {
    val context = LocalContext.current
    Surface(
        shape = MaterialTheme.shapes.small,
        color = SoftBackground,
        modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
    ) {
        Column(Modifier.padding(14.dp)) {
            when (paid) {
                null -> {
                    Text(T.paidQuestion.of(lang), fontWeight = FontWeight.SemiBold)
                    Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PlainButton(T.paidYes.of(lang), onClick = { onPaid(true) }, modifier = Modifier.weight(1f))
                        PlainButton(T.paidNo.of(lang), onClick = { onPaid(false) }, modifier = Modifier.weight(1f))
                    }
                }
                true -> {
                    Text(T.afterYes.of(lang), color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
                    Button(
                        onClick = { context.open(Intent(Intent.ACTION_DIAL, Uri.parse("tel:1930"))) },
                        shape = ButtonShape,
                        colors = ButtonDefaults.buttonColors(containerColor = Danger),
                        modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                    ) {
                        Icon(Icons.Filled.Call, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                        Text(T.call1930.of(lang), fontWeight = FontWeight.SemiBold)
                    }
                }
                false -> Text(T.afterNo.of(lang), color = okColor(), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
