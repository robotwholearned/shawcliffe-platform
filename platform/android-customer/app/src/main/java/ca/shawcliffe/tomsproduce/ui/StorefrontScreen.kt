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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import ca.shawcliffe.tomsproduce.ComponentKeys
import ca.shawcliffe.tomsproduce.DailyStatusValue
import ca.shawcliffe.tomsproduce.Location
import ca.shawcliffe.tomsproduce.Product
import ca.shawcliffe.tomsproduce.ProductStatus
import ca.shawcliffe.tomsproduce.StorefrontViewModel
import ca.shawcliffe.tomsproduce.colorFromHex

@Composable
fun StorefrontScreen(
    onGetUpdates: () -> Unit,
    onReserve: () -> Unit,
    onGetQuote: () -> Unit,
    viewModel: StorefrontViewModel = activityScopedViewModel(),
) {
    LaunchedEffect(Unit) { viewModel.start() }
    DisposableEffect(Unit) { onDispose { viewModel.stop() } }

    val primary = colorFromHex(viewModel.branding?.primaryColor)

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Header(viewModel)
            StatusBadge(viewModel)
            viewModel.location?.let { LocationCard(it, primary) }
            HoursLine(viewModel)
            ProductsSection(viewModel.products, viewModel.status?.let { DailyStatusValue.fromValue(it.status) })

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                Button(onClick = onGetUpdates, modifier = Modifier.weight(1f)) {
                    Text("Get Updates")
                }
                OutlinedButton(onClick = onReserve, modifier = Modifier.weight(1f)) {
                    Text("Reserve an Order")
                }
            }
            if (ComponentKeys.INQUIRY_QUOTE_FORM in viewModel.enabledComponents) {
                OutlinedButton(onClick = onGetQuote, modifier = Modifier.fillMaxWidth()) {
                    Text("Get a Quote")
                }
            }
        }

        if (viewModel.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun Header(viewModel: StorefrontViewModel) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        viewModel.branding?.logoUrl?.let { url ->
            AsyncImage(model = url, contentDescription = null, modifier = Modifier.size(48.dp).clip(RoundedCornerShape(10.dp)))
        }
        Column {
            Text(viewModel.branding?.appName ?: "Tom's Produce", style = MaterialTheme.typography.headlineSmall)
            viewModel.branding?.tagline?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun StatusBadge(viewModel: StorefrontViewModel) {
    if (ComponentKeys.STATUS_TRACKER !in viewModel.enabledComponents) return
    val statusValue = viewModel.status?.status?.let { DailyStatusValue.fromValue(it) } ?: return
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Box(modifier = Modifier.size(10.dp).background(statusValue.color, CircleShape))
        Text(statusValue.label, style = MaterialTheme.typography.titleSmall)
        viewModel.status?.customMessage?.takeIf { it.isNotEmpty() }?.let {
            Text("— $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun LocationCard(location: Location, primary: Color) {
    val context = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
            .padding(12.dp),
    ) {
        Text(location.displayName, style = MaterialTheme.typography.titleSmall)
        location.address?.let { address ->
            Text(
                "$address →",
                color = primary,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        location.parkingNotes?.takeIf { it.isNotEmpty() }?.let {
            Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun HoursLine(viewModel: StorefrontViewModel) {
    val open = viewModel.status?.hoursOpen
    val close = viewModel.status?.hoursClose
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
    val color = when (status) {
        ProductStatus.AVAILABLE -> Color(0xFF2A7A3B)
        ProductStatus.LOW -> Color(0xFFC9A227)
        ProductStatus.SOLD_OUT -> Color(0xFFC0392B)
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
            Text(status.label, color = color, style = MaterialTheme.typography.labelSmall)
        }
    }
}
