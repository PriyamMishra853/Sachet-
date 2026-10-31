package com.unfilteredengineers.sachet.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.unfilteredengineers.sachet.i18n.Lang
import com.unfilteredengineers.sachet.i18n.T
import com.unfilteredengineers.sachet.ui.theme.Border
import com.unfilteredengineers.sachet.ui.theme.ButtonShape
import com.unfilteredengineers.sachet.ui.theme.Danger
import com.unfilteredengineers.sachet.ui.theme.DangerBorder

// Building blocks shared by the screens, so every screen looks the same.

/** A scrolling page with the standard side margins. */
@Composable
fun Page(padding: PaddingValues, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 20.dp),
        content = content,
    )
}

@Composable
fun PageTitle(title: String, lead: String? = null) {
    Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
    lead?.let {
        Text(
            it,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 6.dp, bottom = 16.dp),
        )
    }
}

/** A white box with a thin border: the form, a scam type, a privacy section. */
@Composable
fun Panel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, Border),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(18.dp), content = content)
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.Bold,
        modifier = modifier.padding(top = 32.dp, bottom = 8.dp),
    )
}

@Composable
fun Heading(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 16.dp, bottom = 6.dp),
    )
}

@Composable
fun Bullets(items: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        for (item in items) {
            Row {
                Text("•", modifier = Modifier.width(18.dp))
                Text(item, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, enabled: Boolean = true, modifier: Modifier = Modifier) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = ButtonShape,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 14.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Text(text, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun PlainButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        shape = ButtonShape,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        modifier = modifier,
    ) {
        Text(text, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
    }
}

/** "Already paid a scammer?" with buttons that open the dialer and the cybercrime portal. */
@Composable
fun HelplineCard(lang: Lang) {
    val context = LocalContext.current
    Surface(
        shape = MaterialTheme.shapes.medium,
        border = BorderStroke(1.dp, DangerBorder),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth().padding(top = 32.dp),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            // The red bar on the left, like the website.
            Box(Modifier.width(5.dp).fillMaxHeight().background(Danger))
            Column(Modifier.padding(18.dp)) {
                Text(T.helpTitle.of(lang), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(
                    T.helpBody.of(lang),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp, bottom = 14.dp),
                )
                // ACTION_DIAL only fills in the number; the person still taps call.
                // So the app needs no phone permission.
                Button(
                    onClick = { context.open(Intent(Intent.ACTION_DIAL, Uri.parse("tel:1930"))) },
                    shape = ButtonShape,
                    colors = ButtonDefaults.buttonColors(containerColor = Danger),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Filled.Call, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                    Text(T.call1930.of(lang), fontWeight = FontWeight.SemiBold)
                }
                PlainButton(
                    T.reportOnline.of(lang),
                    onClick = { context.open(Intent(Intent.ACTION_VIEW, Uri.parse("https://cybercrime.gov.in"))) },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
            }
        }
    }
}

fun Context.open(intent: Intent) {
    try {
        startActivity(intent)
    } catch (_: ActivityNotFoundException) {
        // No dialer or browser (some tablets): nothing to open.
    }
}
