package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.PropertiesService

@Composable
fun PropertiesScreen(modifier: Modifier = Modifier) {
    var page by remember { mutableIntStateOf(0) }
    var properties by remember { mutableStateOf<List<PropertiesService.Property>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val pageSize = 25

    LaunchedEffect(page) {
        isLoading = true
        errorMessage = null
        try {
            val response = PropertiesService.fetch(page)
            properties = response.properties
            total = response.total
        } catch (e: Exception) {
            errorMessage = e.message ?: "Couldn't load properties."
        } finally {
            isLoading = false
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (properties?.isEmpty() == true && !isLoading) {
                    item { Text("No properties on file yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                items(properties ?: emptyList(), key = { it.id }) { property ->
                    PropertyRow(property)
                    HorizontalDivider()
                }
            }

            if (total > pageSize) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = { page-- }, enabled = page > 0) { Text("← Prev") }
                    Text(
                        "${page * pageSize + 1}–${minOf((page + 1) * pageSize, total)} of $total",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = { page++ }, enabled = (page + 1) * pageSize < total) { Text("Next →") }
                }
            }
        }

        if (isLoading && properties == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun PropertyRow(property: PropertiesService.Property) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(property.address ?: "Property", style = MaterialTheme.typography.titleSmall)
        property.customer?.let { customer ->
            Text(customer.name, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                customer.phone?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                customer.email?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
        property.gateCode?.let { Text("Gate code: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.parkingInstructions?.let { Text("Parking: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.accessNotes?.let { Text("Access: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.petsOnSite?.let { Text("Pets on site: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.preferredServiceDay?.let { Text("Preferred day: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.lawnSize?.let { Text("Lawn size: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.snowRemovalAreas?.let { Text("Snow removal: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.cleaningInstructions?.let { Text("Cleaning: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        property.safetyNotes?.let { Text("Safety: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}
