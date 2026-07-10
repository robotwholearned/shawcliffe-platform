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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.DocumentSubmissionsService

@Composable
fun DocumentSubmissionsScreen(modifier: Modifier = Modifier) {
    var page by remember { mutableIntStateOf(0) }
    var submissions by remember { mutableStateOf<List<DocumentSubmissionsService.Submission>?>(null) }
    var total by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val pageSize = 25
    val uriHandler = LocalUriHandler.current

    LaunchedEffect(page) {
        isLoading = true
        errorMessage = null
        try {
            val response = DocumentSubmissionsService.fetch(page)
            submissions = response.submissions
            total = response.total
        } catch (e: Exception) {
            errorMessage = e.message ?: "Couldn't load documents."
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
                if (submissions?.isEmpty() == true && !isLoading) {
                    item { Text("No documents submitted yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                items(submissions ?: emptyList(), key = { it.id }) { submission ->
                    SubmissionRow(submission, onOpen = { uriHandler.openUri(submission.fileUrl) })
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

        if (isLoading && submissions == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun SubmissionRow(submission: DocumentSubmissionsService.Submission, onOpen: () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(submission.checklistItem?.title ?: "General submission", style = MaterialTheme.typography.titleSmall)
        submission.customer?.let { customer ->
            Text(customer.name, style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                customer.phone?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                customer.email?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
        TextButton(onClick = onOpen) { Text("View file →", style = MaterialTheme.typography.labelSmall) }
    }
}
