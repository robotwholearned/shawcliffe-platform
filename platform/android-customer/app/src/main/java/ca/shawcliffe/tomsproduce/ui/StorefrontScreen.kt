package ca.shawcliffe.tomsproduce.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import ca.shawcliffe.tomsproduce.ComponentKeys
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.DailyStatusValue
import ca.shawcliffe.tomsproduce.Location
import ca.shawcliffe.tomsproduce.Product
import ca.shawcliffe.tomsproduce.ProductStatus
import ca.shawcliffe.tomsproduce.StorefrontViewModel
import ca.shawcliffe.tomsproduce.colorFromHex

/** Resolves possibly-relative media paths (e.g. "/demo/x.png") against the platform base URL. */
private fun mediaUrl(path: String?): String? {
    if (path.isNullOrEmpty()) return null
    return if (path.startsWith("http")) path else Config.API_BASE_URL.trimEnd('/') + path
}

@Composable
fun StorefrontScreen(
    onGetUpdates: () -> Unit,
    onReserve: () -> Unit,
    onGetQuote: () -> Unit,
    onRequestBooking: () -> Unit,
    onViewDocuments: () -> Unit,
    viewModel: StorefrontViewModel = activityScopedViewModel(),
) {
    LaunchedEffect(Unit) { viewModel.start() }
    DisposableEffect(Unit) { onDispose { viewModel.stop() } }

    val primary = colorFromHex(viewModel.branding?.primaryColor)
    val businessName = viewModel.branding?.appName ?: "Tom's Produce"

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surfaceContainerLowest)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            HeaderBand(viewModel, primary, businessName)

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-32).dp)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                viewModel.errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                StatusCard(viewModel, primary)
                ProductsSection(
                    products = viewModel.products,
                    status = viewModel.status?.let { DailyStatusValue.fromValue(it.status) },
                    primary = primary,
                )

                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = onGetUpdates,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = primary),
                    ) {
                        Text("Get Updates", fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = onReserve, modifier = Modifier.fillMaxWidth()) {
                        Text("Reserve an Order →", color = primary, fontWeight = FontWeight.Bold)
                    }
                    if (ComponentKeys.INQUIRY_QUOTE_FORM in viewModel.enabledComponents) {
                        OutlinedButton(onClick = onGetQuote, modifier = Modifier.fillMaxWidth()) {
                            Text("Get a Quote", color = primary)
                        }
                    }
                    if (ComponentKeys.BOOKING_REQUEST_SYSTEM in viewModel.enabledComponents) {
                        OutlinedButton(onClick = onRequestBooking, modifier = Modifier.fillMaxWidth()) {
                            Text("Request a Booking", color = primary)
                        }
                    }
                    if (ComponentKeys.DOCUMENT_CHECKLIST_INTAKE in viewModel.enabledComponents) {
                        OutlinedButton(onClick = onViewDocuments, modifier = Modifier.fillMaxWidth()) {
                            Text("Documents", color = primary)
                        }
                    }
                }
            }
        }

        if (viewModel.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun HeaderBand(viewModel: StorefrontViewModel, primary: Color, businessName: String) {
    val heroUrl = mediaUrl(viewModel.branding?.heroPhotoUrls?.firstOrNull())

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
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier
                .statusBarsPadding()
                .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 56.dp),
        ) {
            LogoTile(viewModel, businessName)
            Column {
                Text(
                    businessName,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                viewModel.branding?.tagline?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.75f))
                }
            }
        }
    }
}

@Composable
private fun LogoTile(viewModel: StorefrontViewModel, businessName: String) {
    val logoUrl = mediaUrl(viewModel.branding?.logoUrl)
    if (logoUrl != null) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(Color.White, RoundedCornerShape(12.dp))
                .padding(4.dp),
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
            modifier = Modifier
                .size(56.dp)
                .background(Color.White.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                businessName.take(1).uppercase(),
                color = Color.White,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun StatusCard(viewModel: StorefrontViewModel, primary: Color) {
    val showStatus = ComponentKeys.STATUS_TRACKER in viewModel.enabledComponents
    val location = viewModel.location
    if (!showStatus && location == null) return

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top, modifier = Modifier.fillMaxWidth()) {
                Box(modifier = Modifier.weight(1f)) {
                    if (showStatus) {
                        StatusRow(viewModel)
                    } else if (location != null) {
                        Text(location.displayName, style = MaterialTheme.typography.titleSmall)
                    }
                }
                val open = viewModel.status?.hoursOpen
                val close = viewModel.status?.hoursClose
                if (open != null && close != null) {
                    Text(
                        "$open – $close",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (location != null) {
                if (showStatus) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                    Text(location.displayName, style = MaterialTheme.typography.titleSmall)
                } else {
                    Spacer(modifier = Modifier.height(6.dp))
                }
                location.address?.let { address ->
                    Text(
                        "$address →",
                        color = primary,
                        fontWeight = FontWeight.Medium,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
                location.parkingNotes?.takeIf { it.isNotEmpty() }?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusRow(viewModel: StorefrontViewModel) {
    val statusValue = viewModel.status?.status?.let { DailyStatusValue.fromValue(it) }
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .background(statusValue?.color ?: MaterialTheme.colorScheme.outlineVariant, CircleShape),
            )
            Text(
                statusValue?.label ?: "No update yet today",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = statusValue?.color ?: MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        viewModel.status?.customMessage?.takeIf { it.isNotEmpty() }?.let {
            Text(
                it,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 20.dp, top = 2.dp),
            )
        }
    }
}

@Composable
private fun ProductsSection(products: List<Product>, status: DailyStatusValue?, primary: Color) {
    if (products.isNotEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "TODAY'S PRODUCTS",
                    style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                HorizontalDivider(modifier = Modifier.weight(1f))
            }
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column {
                    products.forEachIndexed { index, product ->
                        ProductRow(product, primary)
                        if (index < products.lastIndex) {
                            HorizontalDivider(modifier = Modifier.padding(start = 60.dp))
                        }
                    }
                }
            }
        }
    } else if (status == DailyStatusValue.OPEN) {
        Text(
            "No products listed yet.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
        )
    }
}

@Composable
private fun ProductRow(product: Product, primary: Color) {
    val status = ProductStatus.fromValue(product.status)
    val soldOut = status == ProductStatus.SOLD_OUT
    val statusColor = when (status) {
        ProductStatus.AVAILABLE -> Color(0xFF2A7A3B)
        ProductStatus.LOW -> Color(0xFFB0781A)
        ProductStatus.SOLD_OUT -> MaterialTheme.colorScheme.outline
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .alpha(if (soldOut) 0.6f else 1f),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(primary.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                product.name.take(1).uppercase(),
                color = primary,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
        }

        Text(
            product.name,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            textDecoration = if (soldOut) TextDecoration.LineThrough else null,
            modifier = Modifier.weight(1f),
        )

        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            product.price?.let {
                Text(
                    "$%.2f".format(it),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Box(
                modifier = Modifier
                    .background(statusColor.copy(alpha = 0.12f), RoundedCornerShape(50))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            ) {
                Text(status.label, color = statusColor, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
