package ca.shawcliffe.seller.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.BookingsService
import kotlinx.coroutines.launch

private val STATUS_FILTERS = listOf("all", "requested", "confirmed", "declined", "completed", "cancelled")
private val STATUS_OPTIONS = listOf("requested", "confirmed", "declined", "completed", "cancelled")

@Composable
fun BookingsScreen(modifier: Modifier = Modifier) {
    var statusFilter by remember { mutableStateOf("all") }
    var page by remember { mutableIntStateOf(0) }
    var refreshKey by remember { mutableIntStateOf(0) }
    var bookings by remember { mutableStateOf<List<BookingsService.Booking>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val pageSize = 25
    val scope = rememberCoroutineScope()

    LaunchedEffect(statusFilter, page, refreshKey) {
        isLoading = true
        errorMessage = null
        try {
            val response = BookingsService.fetch(statusFilter.takeIf { it != "all" }, page)
            bookings = response.bookings
            total = response.total
        } catch (e: Exception) {
            errorMessage = e.message ?: "Couldn't load bookings."
        } finally {
            isLoading = false
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                STATUS_FILTERS.forEach { status ->
                    FilterChip(
                        selected = statusFilter == status,
                        onClick = { statusFilter = status; page = 0 },
                        label = { Text(status.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }

            errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (bookings?.isEmpty() == true && !isLoading) {
                    item { Text("No booking requests found.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                items(bookings ?: emptyList(), key = { it.id }) { booking ->
                    BookingRow(
                        booking = booking,
                        onStatusChange = { newStatus ->
                            scope.launch {
                                try {
                                    BookingsService.updateStatus(booking.id, newStatus)
                                    refreshKey++
                                } catch (e: Exception) {
                                    errorMessage = e.message ?: "Couldn't update booking."
                                }
                            }
                        },
                    )
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

        if (isLoading && bookings == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun BookingRow(booking: BookingsService.Booking, onStatusChange: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(booking.service ?: "General booking request", style = MaterialTheme.typography.titleSmall)
            StatusPicker(status = booking.status, onStatusChange = onStatusChange)
        }
        booking.customer?.let { customer ->
            Text(customer.name, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                customer.phone?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                customer.email?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
        if (booking.requestedDate != null || booking.requestedTime != null) {
            Text(
                listOfNotNull(booking.requestedDate, booking.requestedTime).joinToString(" — "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        booking.pet?.let { pet ->
            Text(
                "🐾 " + listOfNotNull(pet.name, pet.breed, pet.size, pet.age).joinToString(" · "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            pet.allergies?.let { Text("Allergies: $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            pet.behaviorNotes?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        booking.notes?.takeIf { it.isNotEmpty() }?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
    }
}

@Composable
private fun StatusPicker(status: String, onStatusChange: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val color = when (status) {
        "requested" -> Color(0xFFB8860B)
        "confirmed" -> Color(0xFF2A7A3B)
        "declined" -> Color(0xFFC0392B)
        "completed" -> Color(0xFF114AC4)
        "cancelled" -> Color.Gray
        else -> Color.Gray
    }
    Box {
        Box(
            modifier = Modifier
                .background(color.copy(alpha = 0.15f), RoundedCornerShape(50))
                .clickable { expanded = true }
                .padding(horizontal = 8.dp, vertical = 3.dp),
        ) {
            Text(
                status.replaceFirstChar { it.uppercase() },
                color = color,
                style = MaterialTheme.typography.labelSmall,
            )
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            STATUS_OPTIONS.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.replaceFirstChar { it.uppercase() }) },
                    onClick = { expanded = false; onStatusChange(option) },
                )
            }
        }
    }
}
