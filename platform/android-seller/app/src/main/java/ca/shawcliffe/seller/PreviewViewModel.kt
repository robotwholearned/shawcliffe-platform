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
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Read-only view of what the customer app / website storefront shows for
 * this seller's own client_id, so sellers can check their own storefront
 * without a separate device. Loads once per tab visit (see [load]) rather
 * than polling like the real customer app — this is a spot-check, not a
 * live surface.
 */
class PreviewViewModel(private val clientId: String) : ViewModel() {
    var branding by mutableStateOf<ClientBranding?>(null)
        private set
    var status by mutableStateOf<StorefrontStatus?>(null)
        private set
    var location by mutableStateOf<StorefrontLocation?>(null)
        private set
    var products by mutableStateOf<List<Product>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    private val today: String = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getDefault()
    }.format(Date())

    fun load() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            listOf(
                async { loadBranding() },
                async { loadStatusAndLocation() },
                async { loadProducts() },
            ).awaitAll()
            isLoading = false
        }
    }

    private suspend fun loadBranding() {
        try {
            branding = supabase.from("client_branding").select {
                filter { eq("client_id", clientId) }
            }.decodeList<ClientBranding>().firstOrNull()
        } catch (e: Exception) {
            errorMessage = "Couldn't load storefront preview."
        }
    }

    private suspend fun loadStatusAndLocation() {
        try {
            status = supabase.from("daily_status").select {
                filter {
                    eq("client_id", clientId)
                    eq("date", today)
                }
            }.decodeList<StorefrontStatus>().firstOrNull()

            val locationId = status?.locationId
            location = if (locationId != null) {
                supabase.from("locations").select {
                    filter {
                        eq("client_id", clientId)
                        eq("id", locationId)
                    }
                }.decodeList<StorefrontLocation>().firstOrNull()
            } else {
                null
            }
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
}
