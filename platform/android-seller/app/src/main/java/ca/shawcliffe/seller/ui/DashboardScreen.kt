package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import ca.shawcliffe.seller.AuthViewModel
import ca.shawcliffe.seller.DashboardViewModel

private class DashboardViewModelFactory(private val clientId: String) :
    androidx.lifecycle.ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T =
        DashboardViewModel(clientId) as T
}

@Composable
fun DashboardScreen(clientId: String, authViewModel: AuthViewModel) {
    val viewModel: DashboardViewModel = viewModel(factory = DashboardViewModelFactory(clientId))
    var tab by remember { mutableIntStateOf(0) }

    androidx.compose.runtime.LaunchedEffect(clientId) {
        viewModel.loadAll()
    }

    Scaffold(
        topBar = {
            Surface(shadowElevation = 2.dp) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(listOf("Dashboard", "Preorders", "Broadcast")[tab], style = MaterialTheme.typography.titleLarge)
                    if (tab == 0) {
                        TextButton(onClick = { authViewModel.signOut() }) { Text("Sign Out") }
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == 0,
                    onClick = { tab = 0 },
                    icon = { Icon(Icons.Filled.Home, contentDescription = null) },
                    label = { Text("Dashboard") },
                )
                NavigationBarItem(
                    selected = tab == 1,
                    onClick = { tab = 1 },
                    icon = { Icon(Icons.Filled.ShoppingBag, contentDescription = null) },
                    label = { Text("Preorders") },
                )
                NavigationBarItem(
                    selected = tab == 2,
                    onClick = { tab = 2 },
                    icon = { Icon(Icons.Filled.Campaign, contentDescription = null) },
                    label = { Text("Broadcast") },
                )
            }
        },
    ) { padding ->
        when (tab) {
            0 -> StatusAndProductsScreen(viewModel, Modifier.padding(padding))
            1 -> PreordersScreen(viewModel, Modifier.padding(padding))
            else -> BroadcastScreen(viewModel, Modifier.padding(padding))
        }
    }

    viewModel.errorMessage?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            confirmButton = { TextButton(onClick = { viewModel.clearError() }) { Text("OK") } },
            title = { Text("Error") },
            text = { Text(error) },
        )
    }
}
