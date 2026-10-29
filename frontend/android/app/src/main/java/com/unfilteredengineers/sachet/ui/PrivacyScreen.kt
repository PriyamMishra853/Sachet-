package com.unfilteredengineers.sachet.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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

@Composable
fun PrivacyScreen(state: UiState, vm: SachetViewModel, padding: PaddingValues) {
    val lang = state.lang
    var confirm by rememberSaveable { mutableStateOf(false) }

    Page(padding) {
        Text(T.navPrivacy.of(lang), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

        for ((title, items) in PRIVACY_SECTIONS) {
            Text(
                title.of(lang),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 16.dp, bottom = 4.dp),
            )
            for (item in items) {
                Row(Modifier.padding(vertical = 2.dp)) {
                    Text("•  ")
                    Text(item.of(lang))
                }
            }
        }

        // Deleting can't be undone, so it asks first.
        Button(
            onClick = { confirm = true },
            enabled = !state.deleting,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
        ) {
            Text(T.deleteButton.of(lang))
        }
        state.deleteMessage?.let { Text(it.of(lang), modifier = Modifier.padding(top = 8.dp)) }

        Text(
            T.aboutTitle.of(lang),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 24.dp, bottom = 4.dp),
        )
        Text(T.aboutBody.of(lang))
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
