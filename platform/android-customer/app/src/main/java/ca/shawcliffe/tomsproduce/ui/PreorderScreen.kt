package ca.shawcliffe.tomsproduce.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ca.shawcliffe.tomsproduce.APIClient
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.Phone
import ca.shawcliffe.tomsproduce.PreorderItemRequest
import ca.shawcliffe.tomsproduce.PreorderRequest
import ca.shawcliffe.tomsproduce.PreorderResponse
import ca.shawcliffe.tomsproduce.StorefrontViewModel
import kotlinx.coroutines.launch

@Composable
fun PreorderScreen(
    onDone: () -> Unit,
    businessName: String = "Tom's Produce",
    storefrontViewModel: StorefrontViewModel = activityScopedViewModel(),
) {
    val products = storefrontViewModel.products
    val quantities = remember { mutableStateMapOf<String, Int>() }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var done by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    if (done) {
        ConfirmationScreen(
            title = "Preorder confirmed!",
            message = "$businessName has your reservation. You'll receive a confirmation shortly.",
        )
        return
    }

    val selectedItems = quantities.filterValues { it > 0 }
    val totalQuantity = selectedItems.values.sum()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Reserve Your Order", style = MaterialTheme.typography.headlineSmall)

        Text("What would you like?", style = MaterialTheme.typography.titleSmall)
        if (products.isEmpty()) {
            Text("No products available for preorder right now.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        products.forEach { product ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text(product.name)
                    product.price?.let {
                        Text("$%.2f".format(it), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = {
                        val current = quantities[product.id] ?: 0
                        quantities[product.id] = (current - 1).coerceAtLeast(0)
                    }) { Icon(Icons.Filled.Remove, contentDescription = "Decrease") }
                    Text("${quantities[product.id] ?: 0}", modifier = Modifier.padding(horizontal = 8.dp))
                    IconButton(onClick = {
                        val current = quantities[product.id] ?: 0
                        quantities[product.id] = (current + 1).coerceAtMost(99)
                    }) { Icon(Icons.Filled.Add, contentDescription = "Increase") }
                }
            }
        }

        Text("Your details", style = MaterialTheme.typography.titleSmall)
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Your name *") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Phone number") },
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email address") },
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Any notes for your order? (optional)") },
            modifier = Modifier.fillMaxWidth(),
        )

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

        Button(
            onClick = {
                error = null
                if (phone.isEmpty() && email.isEmpty()) {
                    error = "Enter a phone number or email so we can confirm your order."
                    return@Button
                }
                Phone.error(phone)?.let {
                    error = it
                    return@Button
                }
                if (selectedItems.isEmpty()) {
                    error = "Select at least one product."
                    return@Button
                }
                submitting = true
                scope.launch {
                    try {
                        APIClient.post<PreorderRequest, PreorderResponse>(
                            "api/preorder",
                            PreorderRequest(
                                client_id = Config.CLIENT_ID,
                                customer_name = name,
                                customer_phone = phone.ifEmpty { null }?.let { Phone.normalize(it) },
                                customer_email = email.ifEmpty { null },
                                items = selectedItems.map { (productId, quantity) -> PreorderItemRequest(productId, quantity) },
                                notes = notes.ifEmpty { null },
                            ),
                        )
                        done = true
                    } catch (e: Exception) {
                        error = e.message
                    }
                    submitting = false
                }
            },
            enabled = !submitting && selectedItems.isNotEmpty() && name.trim().isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (submitting) {
                CircularProgressIndicator(modifier = Modifier.padding(2.dp))
            } else {
                Text("Reserve $totalQuantity item${if (totalQuantity == 1) "" else "s"}")
            }
        }
    }
}
