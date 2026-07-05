package ca.shawcliffe.seller

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class DashboardViewModel(private val clientId: String) : ViewModel() {
    var todayStatus by mutableStateOf<DailyStatus?>(null)
        private set
    var products by mutableStateOf<List<Product>>(emptyList())
        private set
    var preorders by mutableStateOf<List<PreorderDetail>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var isSaving by mutableStateOf(false)
        private set
    var lastSaved by mutableStateOf<String?>(null)
        private set
    var errorMessage by mutableStateOf<String?>(null)

    var isSendingSMS by mutableStateOf(false)
        private set
    var smsResult by mutableStateOf<BroadcastResponse?>(null)
        private set
    var isSendingEmail by mutableStateOf(false)
        private set
    var emailResult by mutableStateOf<BroadcastResponse?>(null)
        private set
    var isSendingPush by mutableStateOf(false)
        private set
    var pushResult by mutableStateOf<BroadcastResponse?>(null)
        private set
    var isSendingTest by mutableStateOf(false)
        private set
    var testResult by mutableStateOf<TestSendResult?>(null)
        private set

    private val today: String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getDefault()
    }.format(Date())

    fun clearError() {
        errorMessage = null
    }

    fun loadAll() {
        viewModelScope.launch {
            isLoading = true
            listOf(
                async { loadStatus() },
                async { loadProducts() },
                async { loadPreorders() },
            ).awaitAll()
            isLoading = false
        }
    }

    private suspend fun loadStatus() {
        try {
            // Unique (client_id, date) constraint guarantees 0 or 1 rows.
            todayStatus = supabase.from("daily_status").select {
                filter {
                    eq("client_id", clientId)
                    eq("date", today)
                }
            }.decodeList<DailyStatus>().firstOrNull()
        } catch (e: Exception) {
            errorMessage = "Couldn't load today's status."
        }
    }

    private suspend fun loadProducts() {
        try {
            products = supabase.from("products").select {
                filter { eq("client_id", clientId) }
                order("sort_order", Order.ASCENDING)
            }.decodeList()
        } catch (e: Exception) {
            errorMessage = "Couldn't load products."
        }
    }

    private suspend fun loadPreorders() {
        try {
            val rows = supabase.from("preorders").select {
                filter { eq("client_id", clientId) }
                order("created_at", Order.DESCENDING)
            }.decodeList<Preorder>()

            if (rows.isEmpty()) {
                preorders = emptyList()
                return
            }

            val customerIds = rows.map { it.customerId }.distinct()
            val customers = supabase.from("customers").select(columns = io.github.jan.supabase.postgrest.query.Columns.raw("id, name, phone, email")) {
                filter {
                    eq("client_id", clientId)
                    isIn("id", customerIds)
                }
            }.decodeList<Customer>()
            val customersById = customers.associateBy { it.id }

            val preorderIds = rows.map { it.id }
            val items = supabase.from("preorder_items").select(columns = io.github.jan.supabase.postgrest.query.Columns.raw("preorder_id, product_id, quantity")) {
                filter {
                    eq("client_id", clientId)
                    isIn("preorder_id", preorderIds)
                }
            }.decodeList<PreorderItem>()
            val productsById = products.associateBy { it.id }

            preorders = rows.map { preorder ->
                val lineItems = items
                    .filter { it.preorderId == preorder.id }
                    .map { (productsById[it.productId]?.name ?: "Unknown item") to it.quantity }
                PreorderDetail(
                    preorder = preorder,
                    customer = customersById[preorder.customerId],
                    items = lineItems,
                )
            }
        } catch (e: Exception) {
            errorMessage = "Couldn't load preorders."
        }
    }

    fun setStatus(status: DailyStatusValue) {
        viewModelScope.launch {
            isSaving = true
            val now = Instant.now().toString()
            try {
                if (todayStatus != null) {
                    supabase.from("daily_status").update(DailyStatusUpdate(status.value, now)) {
                        filter {
                            eq("client_id", clientId)
                            eq("date", today)
                        }
                    }
                } else {
                    todayStatus = supabase.from("daily_status")
                        .insert(DailyStatusInsert(clientId, today, status.value)) { select() }
                        .decodeSingle()
                }
                todayStatus = todayStatus?.copy(status = status.value, updatedAt = now)
                lastSaved = SimpleDateFormat("h:mm a", Locale.US).format(Date())
            } catch (e: Exception) {
                errorMessage = "Couldn't update status."
            }
            isSaving = false
        }
    }

    fun setProductStatus(product: Product, status: ProductStatus) {
        val index = products.indexOfFirst { it.id == product.id }
        if (index < 0) return
        val previous = products
        products = products.toMutableList().also { it[index] = it[index].copy(status = status.value) }
        viewModelScope.launch {
            try {
                supabase.from("products").update(ProductStatusUpdate(status.value)) {
                    filter {
                        eq("client_id", clientId)
                        eq("id", product.id)
                    }
                }
            } catch (e: Exception) {
                products = previous
                errorMessage = "Couldn't update product status."
            }
        }
    }

    fun addProduct(name: String, price: Double?) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            try {
                val inserted = supabase.from("products")
                    .insert(ProductInsert(clientId, trimmed, price, ProductStatus.AVAILABLE.value, products.size)) { select() }
                    .decodeSingle<Product>()
                products = products + inserted
            } catch (e: Exception) {
                errorMessage = "Couldn't add product."
            }
        }
    }

    fun deleteProduct(product: Product) {
        val previous = products
        products = products.filter { it.id != product.id }
        viewModelScope.launch {
            try {
                supabase.from("products").delete {
                    filter {
                        eq("client_id", clientId)
                        eq("id", product.id)
                    }
                }
            } catch (e: Exception) {
                products = previous
                errorMessage = "Couldn't delete product."
            }
        }
    }

    fun endOfDay() {
        viewModelScope.launch {
            isSaving = true
            setStatus(DailyStatusValue.CLOSED)
            val previous = products
            products = products.map { it.copy(status = ProductStatus.SOLD_OUT.value) }
            try {
                supabase.from("products").update(ProductStatusUpdate(ProductStatus.SOLD_OUT.value)) {
                    filter { eq("client_id", clientId) }
                }
            } catch (e: Exception) {
                products = previous
                errorMessage = "Couldn't complete end of day."
            }
            isSaving = false
        }
    }

    fun updatePreorderStatus(detail: PreorderDetail, status: String) {
        val index = preorders.indexOfFirst { it.id == detail.id }
        if (index < 0) return
        val previous = preorders
        preorders = preorders.toMutableList().also {
            it[index] = it[index].copy(preorder = it[index].preorder.copy(status = status))
        }
        viewModelScope.launch {
            try {
                supabase.from("preorders").update(PreorderStatusUpdate(status)) {
                    filter {
                        eq("client_id", clientId)
                        eq("id", detail.id)
                    }
                }
            } catch (e: Exception) {
                preorders = previous
                errorMessage = "Couldn't update preorder."
            }
        }
    }

    fun sendSMSBroadcast(message: String) {
        val trimmed = message.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            isSendingSMS = true
            smsResult = null
            try {
                smsResult = BroadcastService.send("api/broadcast/sms", SMSBroadcastRequest(trimmed))
            } catch (e: Exception) {
                errorMessage = e.message
            }
            isSendingSMS = false
        }
    }

    fun sendEmailBroadcast(subject: String, message: String) {
        val trimmedSubject = subject.trim()
        val trimmedMessage = message.trim()
        if (trimmedSubject.isEmpty() || trimmedMessage.isEmpty()) return
        viewModelScope.launch {
            isSendingEmail = true
            emailResult = null
            try {
                emailResult = BroadcastService.send("api/broadcast/email", EmailBroadcastRequest(trimmedSubject, trimmedMessage))
            } catch (e: Exception) {
                errorMessage = e.message
            }
            isSendingEmail = false
        }
    }

    fun sendPushBroadcast(message: String) {
        val trimmed = message.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            isSendingPush = true
            pushResult = null
            try {
                pushResult = BroadcastService.send("api/broadcast/push", SMSBroadcastRequest(trimmed))
            } catch (e: Exception) {
                errorMessage = e.message
            }
            isSendingPush = false
        }
    }

    fun sendTest(channel: String, smsMessage: String, emailSubject: String, emailMessage: String, pushMessage: String) {
        viewModelScope.launch {
            isSendingTest = true
            testResult = null
            try {
                val response: BroadcastResponse = when (channel) {
                    "sms" -> {
                        val message = smsMessage.trim().ifEmpty { "Test message from your dashboard." }
                        BroadcastService.send("api/broadcast/sms", SMSBroadcastRequest(message, test = true))
                    }
                    "email" -> {
                        val subject = emailSubject.trim().ifEmpty { "Test notification" }
                        val message = emailMessage.trim().ifEmpty { "Test message from your dashboard." }
                        BroadcastService.send("api/broadcast/email", EmailBroadcastRequest(subject, message, test = true))
                    }
                    else -> {
                        val message = pushMessage.trim().ifEmpty { "Test push from your dashboard." }
                        BroadcastService.send("api/broadcast/push", SMSBroadcastRequest(message, test = true))
                    }
                }
                testResult = TestSendResult(
                    channel = channel,
                    ok = response.sent > 0,
                    message = if (response.sent > 0) "Test sent — check your phone/inbox." else (response.errors?.firstOrNull() ?: "Test send failed"),
                )
            } catch (e: Exception) {
                testResult = TestSendResult(channel = channel, ok = false, message = e.message ?: "Test send failed")
            }
            isSendingTest = false
        }
    }
}
