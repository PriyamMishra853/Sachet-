package com.unfilteredengineers.sachet.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.unfilteredengineers.sachet.BuildConfig
import com.unfilteredengineers.sachet.i18n.PRIVACY_SECTIONS
import com.unfilteredengineers.sachet.i18n.T
import com.unfilteredengineers.sachet.ui.theme.ButtonShape
import com.unfilteredengineers.sachet.ui.theme.Danger
import com.unfilteredengineers.sachet.ui.theme.DangerBorder

@Composable
fun PrivacyScreen(state: UiState, vm: SachetActions, padding: PaddingValues) {
    val lang = state.lang
    var confirm by rememberSaveable { mutableStateOf(false) }

    Page(padding) {
        PageTitle(T.privacyTitle.of(lang), T.privacyLead.of(lang))

        for ((title, items) in PRIVACY_SECTIONS) {
            Panel(Modifier.padding(bottom = 12.dp)) {
                Text(
                    title.of(lang),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                Bullets(items.map { it.of(lang) })
            }
        }

        // Deleting can't be undone, so it asks first.
        OutlinedButton(
            onClick = { confirm = true },
            enabled = !state.deleting,
            shape = ButtonShape,
            border = BorderStroke(1.dp, DangerBorder),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Danger),
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        ) {
            Text(T.deleteButton.of(lang), fontWeight = FontWeight.SemiBold)
        }
        state.deleteMessage?.let { Text(it.of(lang), modifier = Modifier.padding(top = 8.dp)) }

        SectionTitle(T.aboutTitle.of(lang))
        Text(T.aboutBody.of(lang), style = MaterialTheme.typography.bodyLarge)
        Text(
            "v${BuildConfig.VERSION_NAME}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp),
        )

        HelplineCard(lang)
    }

    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text(T.deleteConfirmTitle.of(lang)) },
            text = { Text(T.deleteConfirmBody.of(lang)) },
            confirmButton = {
                TextButton(onClick = {
                    confirm = false
                    vm.deleteMyData()
                }) { Text(T.delete.of(lang), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { confirm = false }) { Text(T.cancel.of(lang)) }
            },
        )
    }
}
