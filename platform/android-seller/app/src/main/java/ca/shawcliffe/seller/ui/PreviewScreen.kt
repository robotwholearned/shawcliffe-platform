package ca.shawcliffe.seller.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import ca.shawcliffe.seller.ClientBranding
import ca.shawcliffe.seller.DailyStatusValue
import ca.shawcliffe.seller.PreviewViewModel
import ca.shawcliffe.seller.Product
import ca.shawcliffe.seller.ProductStatus
import ca.shawcliffe.seller.StorefrontLocation
import coil.compose.AsyncImage

private class PreviewViewModelFactory(private val clientId: String) :
    androidx.lifecycle.ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T =
        PreviewViewModel(clientId) as T
}

/** Read-only rendition of the customer storefront, scoped to this seller's own client_id. */
@Composable
fun PreviewScreen(clientId: String, modifier: Modifier = Modifier) {
    val viewModel: PreviewViewModel = viewModel(factory = PreviewViewModelFactory(clientId))

    LaunchedEffect(clientId) { viewModel.load() }

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("What customers see", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                IconButton(onClick = { viewModel.load() }) {
                    Icon(Icons.Filled.Refresh, contentDescription = "Refresh preview")
                }
            }

            Header(viewModel.branding)
            StatusBadge(viewModel.status?.status, viewModel.status?.customMessage)
            viewModel.location?.let { LocationCard(it) }
            HoursLine(viewModel.status?.hoursOpen, viewModel.status?.hoursClose)
            ProductsSection(viewModel.products, DailyStatusValue.fromValue(viewModel.status?.status ?: ""))

            viewModel.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
        }

        if (viewModel.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun Header(branding: ClientBranding?) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        branding?.logoUrl?.let { url ->
            AsyncImage(model = url, contentDescription = null, modifier = Modifier.size(48.dp).clip(RoundedCornerShape(10.dp)))
        }
        Column {
            Text(branding?.appName ?: "Your storefront", style = MaterialTheme.typography.headlineSmall)
            branding?.tagline?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun StatusBadge(status: String?, customMessage: String?) {
    val value = DailyStatusValue.fromValue(status ?: "") ?: return
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Box(modifier = Modifier.size(10.dp).background(statusColor(value), CircleShape))
        Text(value.label, style = MaterialTheme.typography.titleSmall)
        customMessage?.takeIf { it.isNotEmpty() }?.let {
            Text("— $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun statusColor(value: DailyStatusValue): Color = when (value) {
    DailyStatusValue.OPEN -> Color(0xFF218C21)
    DailyStatusValue.CLOSED, DailyStatusValue.SOLD_OUT -> Color(0xFFB32626)
    DailyStatusValue.BACK_TOMORROW, DailyStatusValue.OPENING_SOON -> Color(0xFFD98C1A)
    DailyStatusValue.WEATHER_DELAY -> Color(0xFF4D6699)
}

@Composable
private fun LocationCard(location: StorefrontLocation) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(12.dp),
    ) {
        Text(location.displayName, style = MaterialTheme.typography.titleSmall)
        location.address?.let {
            Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 2.dp))
        }
        location.parkingNotes?.takeIf { it.isNotEmpty() }?.let {
            Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun HoursLine(open: String?, close: String?) {
    if (open != null && close != null) {
        Text("Hours: $open – $close", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ProductsSection(products: List<Product>, status: DailyStatusValue?) {
    if (products.isNotEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("TODAY'S PRODUCTS", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            products.forEach { ProductRow(it) }
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
private fun ProductRow(product: Product) {
    val status = ProductStatus.fromValue(product.status)
    // Customer-facing wording — deliberately not ProductStatus.label, which is
    // the compact glyph ("✓"/"Out") the seller's own action buttons use.
    val (label, color) = when (status) {
        ProductStatus.AVAILABLE -> "Available" to Color(0xFF2A7A3B)
        ProductStatus.LOW -> "Low" to Color(0xFFC9A227)
        ProductStatus.SOLD_OUT -> "Sold Out" to Color(0xFFC0392B)
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(product.name)
            product.price?.let {
                Text("$%.2f".format(it), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Box(
            modifier = Modifier
                .background(color.copy(alpha = 0.15f), RoundedCornerShape(50))
                .padding(horizontal = 10.dp, vertical = 4.dp),
        ) {
            Text(label, color = color, style = MaterialTheme.typography.labelSmall)
        }
    }
}
