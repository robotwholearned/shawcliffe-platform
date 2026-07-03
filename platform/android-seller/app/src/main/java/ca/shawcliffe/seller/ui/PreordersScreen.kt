package ca.shawcliffe.seller.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.DashboardViewModel
import ca.shawcliffe.seller.PreorderDetail

@Composable
fun PreordersScreen(viewModel: DashboardViewModel, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (viewModel.preorders.isEmpty() && !viewModel.isLoading) {
                item { Text("No preorders yet.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            items(viewModel.preorders, key = { it.id }) { detail ->
                PreorderCard(detail, viewModel)
            }
        }
        if (viewModel.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun PreorderCard(detail: PreorderDetail, viewModel: DashboardViewModel) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(detail.customer?.name ?: "Unknown customer", style = MaterialTheme.typography.titleSmall)
            StatusBadge(detail.preorder.status)
        }
        detail.customer?.phone?.let {
            Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        detail.items.forEach { (name, quantity) ->
            Text("${quantity}× $name", style = MaterialTheme.typography.bodyMedium)
        }
        detail.preorder.notes?.takeIf { it.isNotEmpty() }?.let {
            Text(it, style = MaterialTheme.typography.labelSmall, fontStyle = FontStyle.Italic)
        }
        if (detail.preorder.status == "pending") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { viewModel.updatePreorderStatus(detail, "confirmed") }) { Text("Confirm") }
                OutlinedButton(onClick = { viewModel.updatePreorderStatus(detail, "cancelled") }) { Text("Cancel") }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val color = when (status) {
        "pending" -> Color(0xFFB8860B)
        "confirmed" -> Color(0xFF2A7A3B)
        "cancelled" -> Color(0xFFC0392B)
        "completed" -> Color(0xFF114AC4)
        else -> Color.Gray
    }
    Box(
        modifier = Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(status.replaceFirstChar { it.uppercase() }, color = color, style = MaterialTheme.typography.labelSmall)
    }
}
