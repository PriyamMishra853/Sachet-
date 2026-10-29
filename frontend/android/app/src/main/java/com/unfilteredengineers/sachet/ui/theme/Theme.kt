package com.unfilteredengineers.sachet.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color
import com.unfilteredengineers.sachet.data.Band

// Same colours as the website (globals.css), light and dark.

private val Light = lightColorScheme(
    primary = Color(0xFF0F5132),
    onPrimary = Color.White,
    background = Color(0xFFF6F7F5),
    onBackground = Color(0xFF1B1F1D),
    surface = Color.White,
    onSurface = Color(0xFF1B1F1D),
    onSurfaceVariant = Color(0xFF5D6662),
    outline = Color(0xFFDDE2DF),
    error = Color(0xFFB42318),
)

private val Dark = darkColorScheme(
    primary = Color(0xFF4CC38A),
    onPrimary = Color(0xFF0B1A13),
    background = Color(0xFF111413),
    onBackground = Color(0xFFE8ECEA),
    surface = Color(0xFF1A1F1D),
    onSurface = Color(0xFFE8ECEA),
    onSurfaceVariant = Color(0xFFA3ADA8),
    outline = Color(0xFF2D3431),
    error = Color(0xFFFF8A80),
)

data class BandColors(val ink: Color, val background: Color)

@Composable
@ReadOnlyComposable
fun bandColors(band: Band): BandColors {
    val dark = isSystemInDarkTheme()
    return when (band) {
        Band.HIGH -> if (dark) BandColors(Color(0xFFFF8A80), Color(0xFF3A1714)) else BandColors(Color(0xFFB42318), Color(0xFFFDECEA))
        Band.MEDIUM -> if (dark) BandColors(Color(0xFFFFB168), Color(0xFF3A2511)) else BandColors(Color(0xFFB54708), Color(0xFFFEF4E6))
        Band.LOW -> if (dark) BandColors(Color(0xFFF5D76E), Color(0xFF332B0C)) else BandColors(Color(0xFF8A6D00), Color(0xFFFFFBE6))
        Band.UNKNOWN -> if (dark) BandColors(Color(0xFFC0C8D2), Color(0xFF22282E)) else BandColors(Color(0xFF475467), Color(0xFFF2F4F7))
    }
}

@Composable
@ReadOnlyComposable
fun okColor(): Color = if (isSystemInDarkTheme()) Color(0xFF5FD39B) else Color(0xFF067647)

@Composable
fun SachetTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) Dark else Light, content = content)
}
