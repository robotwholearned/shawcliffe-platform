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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.Customer
import ca.shawcliffe.seller.CustomersService
import kotlinx.coroutines.launch

private enum class ReviewRequestStatus { SENDING, SENT, FAILED }

@Composable
fun CustomersScreen(modifier: Modifier = Modifier, showReviewRequest: Boolean = false) {
    var query by remember { mutableStateOf("") }
    var page by remember { mutableIntStateOf(0) }
    var customers by remember { mutableStateOf<List<Customer>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val reviewRequestStatus = remember { mutableStateMapOf<String, ReviewRequestStatus>() }
    val scope = rememberCoroutineScope()
    val pageSize = 25

    LaunchedEffect(query, page) {
        isLoading = true
        errorMessage = null
        try {
            val response = CustomersService.fetch(query, page)
            customers = response.customers
            total = response.total
        } catch (e: Exception) {
            errorMessage = e.message ?: "Couldn't load customers."
        } finally {
            isLoading = false
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; page = 0 },
                label = { Text("Search name, phone, or email") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                if (customers?.isEmpty() == true && !isLoading) {
                    item { Text("No customers found.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                items(customers ?: emptyList(), key = { it.id }) { customer ->
                    CustomerRow(
                        customer = customer,
                        showReviewRequest = showReviewRequest,
                        reviewStatus = reviewRequestStatus[customer.id],
                        onRequestReview = {
                            reviewRequestStatus[customer.id] = ReviewRequestStatus.SENDING
                            scope.launch {
                                try {
                                    CustomersService.requestReview(customer.id)
                                    reviewRequestStatus[customer.id] = ReviewRequestStatus.SENT
                                } catch (e: Exception) {
                                    reviewRequestStatus[customer.id] = ReviewRequestStatus.FAILED
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

        if (isLoading && customers == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun CustomerRow(
    customer: Customer,
    showReviewRequest: Boolean,
    reviewStatus: ReviewRequestStatus?,
    onRequestReview: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(customer.name, style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            customer.phone?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            customer.email?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        if (showReviewRequest && (customer.smsConsent || customer.emailConsent)) {
            when (reviewStatus) {
                ReviewRequestStatus.SENT -> Text("Review request sent ✓", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                ReviewRequestStatus.SENDING -> Text("Sending…", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                ReviewRequestStatus.FAILED -> TextButton(onClick = onRequestReview) { Text("Failed — try again", style = MaterialTheme.typography.labelSmall) }
                null -> TextButton(onClick = onRequestReview) { Text("Request Review", style = MaterialTheme.typography.labelSmall) }
            }
        }
    }
}
