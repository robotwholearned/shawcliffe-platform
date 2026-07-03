package ca.shawcliffe.seller.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

// Brand guidelines specify Inter (body) / Montserrat (display); both ship as
// Google Fonts, not bundled here — falls back to the platform sans default
// until a downloadable-fonts provider or bundled .ttf assets are added.
val Typography = Typography(
    bodyLarge = TextStyle(fontFamily = FontFamily.Default, fontSize = 16.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.Default, fontSize = 22.sp),
)
