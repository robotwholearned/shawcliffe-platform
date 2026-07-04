package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.DailyStatusValue
import ca.shawcliffe.seller.DashboardViewModel
import ca.shawcliffe.seller.Product
import ca.shawcliffe.seller.ProductStatus

@Composable
fun StatusAndProductsScreen(viewModel: DashboardViewModel, modifier: Modifier = Modifier) {
    var showAddProduct by remember { mutableStateOf(false) }
    var newProductName by remember { mutableStateOf("") }
    var newProductPrice by remember { mutableStateOf("") }

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Today's Status", style = MaterialTheme.typography.titleMedium)
                    viewModel.lastSaved?.let { Text("Saved $it", style = MaterialTheme.typography.labelSmall) }
                }
                Spacer(Modifier.padding(top = 4.dp))
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.fillMaxWidth().height(56.dp * (DailyStatusValue.entries.size / 2 + 1)),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(DailyStatusValue.entries) { option ->
                        val selected = viewModel.todayStatus?.status == option.value
                        Button(
                            onClick = { viewModel.setStatus(option) },
                            enabled = !viewModel.isSaving,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                            ),
                        ) {
                            Text("${option.emoji} ${option.label}")
                        }
                    }
                }
            }

            item { HorizontalDivider() }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Products", style = MaterialTheme.typography.titleMedium)
                    TextButton(onClick = { showAddProduct = !showAddProduct }) {
                        Text(if (showAddProduct) "Cancel" else "+ Add")
                    }
                }
            }

            items(viewModel.products, key = { it.id }) { product ->
                ProductRow(product = product, viewModel = viewModel)
            }

            if (showAddProduct) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = newProductName,
                            onValueChange = { newProductName = it },
                            label = { Text("Product name") },
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        OutlinedTextField(
                            value = newProductPrice,
                            onValueChange = { newProductPrice = it },
                            label = { Text("Price") },
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.width(100.dp),
                        )
                        Spacer(Modifier.width(8.dp))
                        Button(
                            onClick = {
                                viewModel.addProduct(newProductName, newProductPrice.toDoubleOrNull())
                                newProductName = ""
                                newProductPrice = ""
                                showAddProduct = false
                            },
                            enabled = newProductName.isNotBlank(),
                        ) { Text("Add") }
                    }
                }
            }

            item { HorizontalDivider() }

            item {
                OutlinedButton(
                    onClick = { viewModel.endOfDay() },
                    enabled = !viewModel.isSaving,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("End of Day — Mark All Sold Out")
                }
            }
        }

        if (viewModel.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun ProductRow(product: Product, viewModel: DashboardViewModel) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(product.name)
                product.price?.let {
                    Text("$%.2f".format(it), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                ProductStatus.entries.forEach { status ->
                    val selected = product.status == status.value
                    OutlinedButton(
                        onClick = { viewModel.setProductStatus(product, status) },
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (selected) colorFor(status) else Color.Transparent,
                            contentColor = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                        ),
                    ) { Text(status.label, style = MaterialTheme.typography.labelSmall) }
                }
            }
        }
        TextButton(onClick = { viewModel.deleteProduct(product) }) {
            Text("Delete", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
        }
    }
}

private fun colorFor(status: ProductStatus): Color = when (status) {
    ProductStatus.AVAILABLE -> Color(0xFF2A7A3B)
    ProductStatus.LOW -> Color(0xFFC9A227)
    ProductStatus.SOLD_OUT -> Color(0xFFC0392B)
}
