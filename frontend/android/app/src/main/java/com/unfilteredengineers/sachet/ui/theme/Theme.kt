package com.unfilteredengineers.sachet.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.unfilteredengineers.sachet.data.Band

// Same look as the website (globals.css): a calm public-service app. Light
// only, one navy brand colour, red and amber only for risk.

val Brand = Color(0xFF0B3D91)
val BrandSoft = Color(0xFFE8EEF9)
val SoftBackground = Color(0xFFF4F6F9)
val Border = Color(0xFFD9DEE5)
val FieldBorder = Color(0xFFAAB3BF)
val Danger = Color(0xFFB42318)
val DangerSoft = Color(0xFFFEF3F2)
val DangerBorder = Color(0xFFF4C7C2)

private val Colors = lightColorScheme(
    primary = Brand,
    onPrimary = Color.White,
    primaryContainer = BrandSoft,
    onPrimaryContainer = Brand,
    secondaryContainer = BrandSoft,
    onSecondaryContainer = Brand,
    background = Color.White,
    onBackground = Color(0xFF15191E),
    surface = Color.White,
    onSurface = Color(0xFF15191E),
    surfaceVariant = SoftBackground,
    onSurfaceVariant = Color(0xFF4B5563),
    surfaceContainer = Color.White,
    outline = FieldBorder,
    outlineVariant = Border,
    error = Danger,
)

// Moderate corners everywhere, not pills: buttons look like the website's.
private val SachetShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(12.dp),
)

/** Corner shape for every button, so none fall back to Material's full pill. */
val ButtonShape = RoundedCornerShape(8.dp)

data class BandColors(val ink: Color, val background: Color, val border: Color)

fun bandColors(band: Band): BandColors = when (band) {
    Band.HIGH -> BandColors(Danger, DangerSoft, DangerBorder)
    Band.MEDIUM -> BandColors(Color(0xFF9A4A00), Color(0xFFFFF6EB), Color(0xFFF5D2A8))
    Band.LOW -> BandColors(Color(0xFF7A5C00), Color(0xFFFFFBEA), Border)
    Band.UNKNOWN -> BandColors(Color(0xFF344054), SoftBackground, Border)
}

fun okColor(): Color = Color(0xFF067647)

@Composable
fun SachetTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, shapes = SachetShapes, content = content)
}
