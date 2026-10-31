package com.unfilteredengineers.sachet.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.unfilteredengineers.sachet.data.MAX_MESSAGE_LENGTH
import com.unfilteredengineers.sachet.i18n.SCAM_TYPE_NAMES
import com.unfilteredengineers.sachet.i18n.T
import com.unfilteredengineers.sachet.ui.theme.ButtonShape
import com.unfilteredengineers.sachet.ui.theme.okColor

@Composable
fun ReportScreen(state: UiState, vm: SachetActions, padding: PaddingValues) {
    val lang = state.lang
    val r = state.report
    val canSend = r.state != SendState.SENDING && (r.identifier.isNotBlank() || r.text.isNotBlank())

    Page(padding) {
        PageTitle(T.reportTitle.of(lang), T.reportIntro.of(lang))

        Panel {
        OutlinedTextField(
            value = r.identifier,
            onValueChange = { v -> vm.editReport { it.copy(identifier = v.take(500)) } },
            label = { Text(T.reportWhat.of(lang)) },
            placeholder = { Text("+91 98765 43210 · name@ybl · bit.ly/abc") },
            singleLine = true,
            shape = MaterialTheme.shapes.small,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, autoCorrectEnabled = false),
            modifier = Modifier.fillMaxWidth(),
        )

        ScamTypePicker(
            selected = r.scamType,
            lang = lang,
            onPick = { v -> vm.editReport { it.copy(scamType = v) } },
        )

        OutlinedTextField(
            value = r.text,
            onValueChange = { v -> vm.editReport { it.copy(text = v.take(MAX_MESSAGE_LENGTH)) } },
            label = { Text(T.reportText.of(lang)) },
            minLines = 4,
            shape = MaterialTheme.shapes.small,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )

        OutlinedTextField(
            value = r.amount,
            // Digits only, and at most ₹100 crore (the API's limit is ₹1 billion).
            onValueChange = { v -> vm.editReport { it.copy(amount = v.filter(Char::isDigit).take(9)) } },
            label = { Text(T.reportAmount.of(lang)) },
            placeholder = { Text("2999") },
            singleLine = true,
            shape = MaterialTheme.shapes.small,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )

        Text(
            T.reportPrivacy.of(lang),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 12.dp),
        )

        PrimaryButton(T.reportSubmit.of(lang), onClick = vm::sendReport, enabled = canSend, modifier = Modifier.padding(top = 14.dp))

        r.error?.let {
            Text(it.of(lang), color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
        }
        if (r.state == SendState.DONE || r.state == SendState.DUPLICATE) {
            Text(
                (if (r.state == SendState.DONE) T.reportThanks else T.reportDuplicate).of(lang),
                color = okColor(),
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        }

        HelplineCard(lang)
    }
}

@Composable
private fun ScamTypePicker(selected: String?, lang: com.unfilteredengineers.sachet.i18n.Lang, onPick: (String?) -> Unit) {
    var open by remember { mutableStateOf(false) }
    val label = selected?.let { SCAM_TYPE_NAMES[it]?.of(lang) } ?: T.unknown.of(lang)

    Text(T.reportType.of(lang), style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
    Box {
        OutlinedButton(
            onClick = { open = true },
            shape = ButtonShape,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("$label  ▾", color = MaterialTheme.colorScheme.onSurface)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            DropdownMenuItem(text = { Text(T.unknown.of(lang)) }, onClick = { onPick(null); open = false })
            for ((id, name) in SCAM_TYPE_NAMES) {
                DropdownMenuItem(text = { Text(name.of(lang)) }, onClick = { onPick(id); open = false })
            }
        }
    }
}
