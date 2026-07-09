package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.QuestionAnswer
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Storefront
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
import ca.shawcliffe.seller.ComponentKeys
import ca.shawcliffe.seller.DashboardViewModel

private class DashboardViewModelFactory(private val clientId: String) :
    androidx.lifecycle.ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T =
        DashboardViewModel(clientId) as T
}

private data class DashboardTab(
    val title: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val content: @Composable (Modifier) -> Unit,
)

@Composable
fun DashboardScreen(clientId: String, authViewModel: AuthViewModel) {
    val viewModel: DashboardViewModel = viewModel(factory = DashboardViewModelFactory(clientId))
    var tab by remember { mutableIntStateOf(0) }
    val showCustomers = ComponentKeys.CUSTOMER_DATABASE in authViewModel.enabledComponents
    val showInquiries = ComponentKeys.INQUIRY_QUOTE_FORM in authViewModel.enabledComponents
    val showBookings = ComponentKeys.BOOKING_REQUEST_SYSTEM in authViewModel.enabledComponents
    val showReviewRequest = ComponentKeys.REVIEW_REQUEST_SYSTEM in authViewModel.enabledComponents

    androidx.compose.runtime.LaunchedEffect(clientId) {
        viewModel.loadAll()
    }

    val tabs = buildList {
        add(DashboardTab("Dashboard", Icons.Filled.Home) { m -> StatusAndProductsScreen(viewModel, m) })
        add(DashboardTab("Preorders", Icons.Filled.ShoppingBag) { m -> PreordersScreen(viewModel, m) })
        add(DashboardTab("Broadcast", Icons.Filled.Campaign) { m -> BroadcastScreen(viewModel, clientId, m) })
        add(DashboardTab("Preview", Icons.Filled.Storefront) { m -> PreviewScreen(clientId, m) })
        if (showCustomers) add(DashboardTab("Customers", Icons.Filled.People) { m -> CustomersScreen(m, showReviewRequest) })
        if (showInquiries) add(DashboardTab("Inquiries", Icons.Filled.QuestionAnswer) { m -> InquiriesScreen(m) })
        if (showBookings) add(DashboardTab("Bookings", Icons.Filled.CalendarMonth) { m -> BookingsScreen(m) })
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
                    Text(tabs[tab].title, style = MaterialTheme.typography.titleLarge)
                    if (tab == 0) {
                        TextButton(onClick = { authViewModel.signOut() }) { Text("Sign Out") }
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, dashboardTab ->
                    NavigationBarItem(
                        selected = tab == index,
                        onClick = { tab = index },
                        icon = { Icon(dashboardTab.icon, contentDescription = null) },
                        label = { Text(dashboardTab.title) },
                    )
                }
            }
        },
    ) { padding ->
        tabs[tab].content(Modifier.padding(padding))
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
