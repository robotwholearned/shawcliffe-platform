package ca.shawcliffe.tomsproduce

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class StorefrontViewModel : ViewModel() {
    var branding by mutableStateOf<ClientBranding?>(null)
        private set
    var status by mutableStateOf<DailyStatus?>(null)
        private set
    var location by mutableStateOf<Location?>(null)
        private set
    var products by mutableStateOf<List<Product>>(emptyList())
        private set
    var isLoading by mutableStateOf(true)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    private val clientId = Config.CLIENT_ID
    private var pollJob: Job? = null
    private val today: String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getDefault()
    }.format(Date())

    fun start() {
        viewModelScope.launch {
            loadAll()
            isLoading = false
            startPolling()
        }
    }

    fun stop() {
        pollJob?.cancel()
        pollJob = null
    }

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(5_000)
                if (!isActive) break
                loadStatus()
                loadProducts()
            }
        }
    }

    private suspend fun loadAll() {
        loadBranding()
        loadStatus()
        loadProducts()
    }

    private suspend fun loadBranding() {
        try {
            branding = supabase.from("client_branding").select {
                filter { eq("client_id", clientId) }
            }.decodeList<ClientBranding>().firstOrNull()
        } catch (e: Exception) {
            errorMessage = "Couldn't load storefront."
        }
    }

    private suspend fun loadStatus() {
        try {
            val rows = supabase.from("daily_status").select {
                filter {
                    eq("client_id", clientId)
                    eq("date", today)
                }
            }.decodeList<DailyStatus>()
            status = rows.firstOrNull()
            val locationId = status?.locationId
            if (locationId != null) {
                loadLocation(locationId)
            } else {
                location = null
            }
        } catch (e: Exception) {
            // Keep showing last-known status rather than clobbering it with an error.
        }
    }

    private suspend fun loadLocation(id: String) {
        try {
            location = supabase.from("locations").select {
                filter {
                    eq("client_id", clientId)
                    eq("id", id)
                }
            }.decodeList<Location>().firstOrNull()
        } catch (e: Exception) {
            // Non-critical — leave last-known location in place.
        }
    }

    private suspend fun loadProducts() {
        try {
            products = supabase.from("products").select {
                filter { eq("client_id", clientId) }
                order("sort_order", io.github.jan.supabase.postgrest.query.Order.ASCENDING)
            }.decodeList()
        } catch (e: Exception) {
            // Non-critical — leave last-known products in place.
        }
    }
}
