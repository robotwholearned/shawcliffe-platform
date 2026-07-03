package ca.shawcliffe.tomsproduce.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// platform/brand/shawcliffe-digital-brand-guidelines.html — base theme before
// per-client branding (client_branding.primary_color etc.) tints the UI.
val BrandPrimary = Color(0xFF114AC4)
val BrandSecondary = Color(0xFF3A6AE8)
val BrandInk = Color(0xFF040F23)
val BrandSuccess = Color(0xFF2A7A3B)
val BrandError = Color(0xFFC0392B)
val BrandSurface = Color(0xFFF8F9FC)
val BrandSurfaceAlt = Color(0xFFEEF0F6)

private val LightColors = lightColorScheme(
    primary = BrandPrimary,
    secondary = BrandSecondary,
    error = BrandError,
    background = BrandSurface,
    surface = Color.White,
    surfaceVariant = BrandSurfaceAlt,
    onPrimary = Color.White,
    onBackground = BrandInk,
    onSurface = BrandInk,
)

private val DarkColors = darkColorScheme(
    primary = BrandSecondary,
    secondary = BrandPrimary,
    error = BrandError,
)

@Composable
fun ShawcliffeCustomerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    seed: Color? = null,
    content: @Composable () -> Unit,
) {
    val colors = when {
        seed != null && !darkTheme -> LightColors.copy(primary = seed)
        seed != null -> DarkColors.copy(primary = seed)
        darkTheme -> DarkColors
        else -> LightColors
    }
    MaterialTheme(colorScheme = colors, content = content)
}
