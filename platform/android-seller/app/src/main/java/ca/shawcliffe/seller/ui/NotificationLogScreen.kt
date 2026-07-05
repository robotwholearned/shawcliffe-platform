package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import ca.shawcliffe.seller.NotificationLogEntry
import ca.shawcliffe.seller.NotificationLogViewModel

private class NotificationLogViewModelFactory(private val clientId: String) :
    androidx.lifecycle.ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T =
        NotificationLogViewModel(clientId) as T
}

@Composable
fun NotificationLogScreen(clientId: String, modifier: Modifier = Modifier) {
    val viewModel: NotificationLogViewModel = viewModel(factory = NotificationLogViewModelFactory(clientId))

    LaunchedEffect(clientId) { viewModel.load() }

    if (viewModel.isLoading && viewModel.entries.isEmpty()) {
        CircularProgressIndicator(modifier = modifier.padding(24.dp))
        return
    }

    if (viewModel.entries.isEmpty()) {
        Text("No notifications sent yet.", modifier = modifier.padding(16.dp))
        return
    }

    LazyColumn(modifier = modifier.fillMaxSize()) {
        items(viewModel.entries) { entry ->
            NotificationLogRow(entry)
            HorizontalDivider()
        }
    }
}

@Composable
private fun NotificationLogRow(entry: NotificationLogEntry) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(entry.channel.uppercase(), style = MaterialTheme.typography.labelSmall)
            Text(
                entry.status,
                style = MaterialTheme.typography.labelSmall,
                color = if (entry.status == "failed") MaterialTheme.colorScheme.error else androidx.compose.ui.graphics.Color(0xFF2A7A3B),
            )
        }
        Text(entry.messagePreview ?: "—", style = MaterialTheme.typography.bodyMedium)
        Text(entry.sentAt, style = MaterialTheme.typography.labelSmall)
    }
}
