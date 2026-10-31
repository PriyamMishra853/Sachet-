package com.unfilteredengineers.sachet.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.unfilteredengineers.sachet.R
import com.unfilteredengineers.sachet.i18n.Lang
import com.unfilteredengineers.sachet.i18n.T
import com.unfilteredengineers.sachet.ui.theme.Border
import com.unfilteredengineers.sachet.ui.theme.ButtonShape

// The app shell: the Sachet bar with the language switch, the current screen,
// and the bottom bar to move between Check, Report a scam and Privacy.
@Composable
fun SachetApp(vm: SachetViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    SachetAppContent(state, vm)
}

/** The whole app for a given state; drawn by the screenshot tests too. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SachetAppContent(state: UiState, vm: SachetActions) {
    val lang = state.lang

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Image(painterResource(R.drawable.ic_logo), contentDescription = null, modifier = Modifier.size(28.dp))
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text("Sachet", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                                Text(
                                    T.brandTagline.of(lang),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    },
                    actions = {
                        OutlinedButton(
                            onClick = vm::toggleLang,
                            shape = ButtonShape,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.padding(end = 8.dp),
                        ) {
                            Text(
                                if (lang == Lang.EN) "हिंदी" else "English",
                                color = MaterialTheme.colorScheme.onSurface,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                )
                HorizontalDivider(color = Border)
            }
        },
        bottomBar = {
            Column {
                HorizontalDivider(color = Border)
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
                    val items = listOf(
                        Triple(Screen.CHECK, Icons.Outlined.Search, T.navCheck),
                        Triple(Screen.REPORT, Icons.Outlined.Warning, T.navReport),
                        Triple(Screen.PRIVACY, Icons.Outlined.Lock, T.navPrivacy),
                    )
                    for ((screen, icon, label) in items) {
                        NavigationBarItem(
                            selected = state.screen == screen,
                            onClick = { vm.show(screen) },
                            icon = { Icon(icon, contentDescription = null) },
                            label = { Text(label.of(lang)) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            ),
                        )
                    }
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when (state.screen) {
            Screen.CHECK -> CheckScreen(state, vm, padding)
            Screen.REPORT -> ReportScreen(state, vm, padding)
            Screen.PRIVACY -> PrivacyScreen(state, vm, padding)
        }
    }
}
