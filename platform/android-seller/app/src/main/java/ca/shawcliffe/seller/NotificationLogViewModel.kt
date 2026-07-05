package ca.shawcliffe.seller

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch

class NotificationLogViewModel(private val clientId: String) : ViewModel() {
    var entries by mutableStateOf<List<NotificationLogEntry>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun load() {
        viewModelScope.launch {
            isLoading = true
            try {
                entries = supabase.from("notification_log").select {
                    filter { eq("client_id", clientId) }
                    order("sent_at", Order.DESCENDING)
                    limit(50)
                }.decodeList()
            } catch (e: Exception) {
                errorMessage = "Couldn't load notification history."
            }
            isLoading = false
        }
    }
}
