package ca.shawcliffe.tomsproduce.ui

import android.content.Context
import android.provider.Settings
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ca.shawcliffe.tomsproduce.ClientBranding
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.StorefrontViewModel
import ca.shawcliffe.tomsproduce.colorFromHex
import ca.shawcliffe.tomsproduce.ui.theme.ShawcliffeCustomerTheme
import coil.compose.AsyncImage

// Shared branded shell for the customer form screens — mirrors the web BrandedShell
// contract (.omc/handoffs/team-plan.md) and reuses the storefront hero anatomy.

private const val CONTENT_MAX_WIDTH = 512 // dp — web max-w-lg
private val ACCENT_FALLBACK = Color(0xFFF59E0B)
private val CARD_BORDER = Color(0xFFF0F0F0) // hairline (gray-100)
private val DARK_TEXT = Color(0xFF040F23)

/** Readable-text rule from the contract: luminance > 0.6 ⇒ light background ⇒ dark text. */
private fun Color.isLight(): Boolean = (0.299f * red + 0.587f * green + 0.114f * blue) > 0.6f

// ponytail: 3-line dup of StorefrontScreen.mediaUrl rather than widening that private helper across files.
private fun mediaUrl(path: String?): String? {
    if (path.isNullOrEmpty()) return null
    return if (path.startsWith("http")) path else Config.API_BASE_URL.trimEnd('/') + path
}

// ponytail: honors "remove animations"/animator-scale=0; Android has no finer reduce-motion API pre-14.
private fun animationsEnabled(context: Context): Boolean =
    Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0f

@Composable
private fun brandingFromStore(): ClientBranding? =
    activityScopedViewModel<StorefrontViewModel>().branding

/**
 * Branded page shell: primary header band (logo + business name + tagline, hero photo scrim,
 * readable-text luminance rule) over a centered, max-512dp body whose first card overlaps the
 * band by -32dp. Wrap form content in [CardSection]s; finish with [BrandedCta].
 */
@Composable
fun BrandedScaffold(
    onBack: (() -> Unit)? = null,
    branding: ClientBranding? = brandingFromStore(),
    content: @Composable ColumnScope.() -> Unit,
) {
    ShawcliffeCustomerTheme(branding = branding) {
        val primary = colorFromHex(branding?.primaryColor)
        val businessName = branding?.appName ?: "Tom's Produce"
        val heroUrl = mediaUrl(branding?.heroPhotoUrls?.firstOrNull())
        val onHeader = if (heroUrl != null || !primary.isLight()) Color.White else DARK_TEXT
        val chipBg = if (heroUrl == null && primary.isLight()) Color.Black.copy(alpha = 0.10f)
        else Color.White.copy(alpha = 0.15f)

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surfaceContainerLowest),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Header(branding, primary, businessName, heroUrl, onHeader, chipBg, onBack)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = CONTENT_MAX_WIDTH.dp)
                        .offset(y = (-32).dp)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    content = content,
                )
            }
        }
    }
}

@Composable
private fun Header(
    branding: ClientBranding?,
    primary: Color,
    businessName: String,
    heroUrl: String?,
    onHeader: Color,
    chipBg: Color,
    onBack: (() -> Unit)?,
) {
    Box(modifier = Modifier.fillMaxWidth().background(primary)) {
        if (heroUrl != null) {
            AsyncImage(
                model = heroUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            )
            Box(modifier = Modifier.matchParentSize().background(Color.Black.copy(alpha = 0.5f)))
        }
        Column(
            modifier = Modifier
                .statusBarsPadding()
                .fillMaxWidth()
                .padding(start = 8.dp, end = 16.dp, top = 8.dp, bottom = 56.dp),
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = onHeader)
                }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(start = 8.dp, top = if (onBack != null) 4.dp else 32.dp),
            ) {
                LogoChip(branding, businessName, onHeader, chipBg, size = 56.dp, radius = 12.dp)
                Column {
                    Text(
                        businessName,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = onHeader,
                    )
                    branding?.tagline?.let {
                        Text(it, style = MaterialTheme.typography.bodyMedium, color = onHeader.copy(alpha = 0.75f))
                    }
                }
            }
        }
    }
}

@Composable
private fun LogoChip(
    branding: ClientBranding?,
    businessName: String,
    initialColor: Color,
    fallbackBg: Color,
    size: Dp,
    radius: Dp,
) {
    val logoUrl = mediaUrl(branding?.logoUrl)
    if (logoUrl != null) {
        Box(
            modifier = Modifier.size(size).background(Color.White, RoundedCornerShape(radius)).padding(4.dp),
            contentAlignment = Alignment.Center,
        ) {
            AsyncImage(
                model = logoUrl,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(radius - 4.dp)),
            )
        }
    } else {
        Box(
            modifier = Modifier.size(size).background(fallbackBg, RoundedCornerShape(radius)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                businessName.take(1).uppercase(),
                color = initialColor,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

/**
 * A white card section (radius 16, hairline border, padding 20) with an optional big [title] and
 * an accent-ticked [eyebrow] label in the brand secondary color. Enters with a staggered fade+rise
 * keyed off [index]; no-ops when system animations are off.
 */
@Composable
fun ColumnScope.CardSection(
    title: String? = null,
    eyebrow: String? = null,
    index: Int = 0,
    branding: ClientBranding? = brandingFromStore(),
    content: @Composable ColumnScope.() -> Unit,
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val animate = remember { animationsEnabled(context) }
    val state = remember { MutableTransitionState(!animate).apply { targetState = true } }
    val delayMs = if (animate) index * 80 else 0

    AnimatedVisibility(
        visibleState = state,
        enter = if (animate) {
            fadeIn(tween(400, delayMs)) +
                slideInVertically(tween(400, delayMs)) { with(density) { 8.dp.roundToPx() } }
        } else {
            EnterTransition.None
        },
    ) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, CARD_BORDER),
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (eyebrow != null) {
                    val primary = colorFromHex(branding?.primaryColor)
                    val secondary = colorFromHex(branding?.secondaryColor, default = primary)
                    val accent = colorFromHex(branding?.accentColor, default = ACCENT_FALLBACK)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(modifier = Modifier.width(2.dp).height(12.dp).background(accent, RoundedCornerShape(1.dp)))
                        Text(
                            eyebrow.uppercase(),
                            color = secondary,
                            style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp),
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                if (title != null) {
                    Text(
                        title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
                content()
            }
        }
    }
}

/** Full-width primary CTA: rounded 12, press scale 0.95, swaps to a spinner while [loading]. */
@Composable
fun BrandedCta(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    branding: ClientBranding? = brandingFromStore(),
) {
    val primary = colorFromHex(branding?.primaryColor)
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.95f else 1f, label = "cta-scale")
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        interactionSource = interaction,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = primary, contentColor = Color.White),
        contentPadding = PaddingValues(vertical = 14.dp),
        modifier = modifier.fillMaxWidth().scale(scale),
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text, fontWeight = FontWeight.SemiBold)
        }
    }
}

/** Branded success state — same header shell + one card with logo/✓ mark, message, and back link. */
@Composable
fun BrandedSuccess(
    title: String,
    message: String,
    onBack: (() -> Unit)? = null,
    branding: ClientBranding? = brandingFromStore(),
) {
    BrandedScaffold(onBack = onBack, branding = branding) {
        val primary = colorFromHex(branding?.primaryColor)
        CardSection(branding = branding) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SuccessMark(branding, primary)
                Text(
                    title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                if (onBack != null) {
                    TextButton(onClick = onBack) {
                        Text("← Back to storefront", color = primary, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SuccessMark(branding: ClientBranding?, primary: Color) {
    val logoUrl = mediaUrl(branding?.logoUrl)
    if (logoUrl != null) {
        Box(
            modifier = Modifier.size(64.dp).background(Color.White, RoundedCornerShape(12.dp)).padding(4.dp),
            contentAlignment = Alignment.Center,
        ) {
            AsyncImage(
                model = logoUrl,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp)),
            )
        }
    } else {
        Box(
            modifier = Modifier.size(64.dp).background(primary, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text("✓", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
    }
}
