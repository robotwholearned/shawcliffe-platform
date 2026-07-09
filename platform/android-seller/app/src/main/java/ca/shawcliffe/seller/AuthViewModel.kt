package ca.shawcliffe.seller

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.exceptions.HttpRequestException
import io.github.jan.supabase.exceptions.RestException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

private const val TAG = "AuthViewModel"

class AuthViewModel : ViewModel() {
    var isAuthenticated by mutableStateOf(false)
        private set
    var clientId by mutableStateOf<String?>(null)
        private set
    var role by mutableStateOf<String?>(null)
        private set
    // Enabled component keys for this client (Tier 0 gating). Loaded once auth
    // succeeds; gate UI with ComponentKeys.SOME_KEY in enabledComponents.
    var enabledComponents by mutableStateOf<List<String>>(emptyList())
        private set
    var errorMessage by mutableStateOf<String?>(null)
    var isLoading by mutableStateOf(false)
        private set
    var isRestoringSession by mutableStateOf(true)
        private set

    init {
        viewModelScope.launch { restoreSession() }
    }

    private suspend fun restoreSession() {
        try {
            // Waits for supabase-kt to finish loading any persisted session
            // (Initializing) before deciding whether we're authenticated.
            val status = supabase.auth.sessionStatus.first { it !is SessionStatus.Initializing }
            if (status is SessionStatus.Authenticated) {
                apply(status.session.user?.appMetadata)
            } else {
                isAuthenticated = false
            }
        } catch (e: Exception) {
            isAuthenticated = false
        } finally {
            isRestoringSession = false
        }
    }

    fun signIn(email: String, password: String) {
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                supabase.auth.signInWith(io.github.jan.supabase.auth.providers.builtin.Email) {
                    this.email = email
                    this.password = password
                }
                apply(supabase.auth.currentUserOrNull()?.appMetadata)
            } catch (e: RestException) {
                // e.error/e.description are GoTrue's actual reason (e.g. "invalid_credentials",
                // "email_not_confirmed", "user_banned") — surfacing them instead of a fixed
                // string, since a hardcoded "Invalid email or password" here previously masked
                // every other failure reason too.
                Log.e(TAG, "Sign-in rejected: ${e.statusCode} ${e.error} — ${e.description}", e)
                errorMessage = e.description
            } catch (e: HttpRequestException) {
                Log.e(TAG, "Sign-in network error", e)
                errorMessage = "Couldn't reach the server. Check your connection and try again."
            } catch (e: Exception) {
                Log.e(TAG, "Sign-in failed", e)
                errorMessage = "Something went wrong. Please try again."
            } finally {
                isLoading = false
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try {
                supabase.auth.signOut()
            } catch (_: Exception) {
                // Best-effort — clear local state regardless.
            }
            isAuthenticated = false
            clientId = null
            role = null
            enabledComponents = emptyList()
        }
    }

    private fun loadEnabledComponents() {
        viewModelScope.launch {
            enabledComponents = runCatching { ComponentsService.fetch() }
                .onFailure { Log.e(TAG, "Failed to load enabled components", it) }
                .getOrDefault(emptyList())
        }
    }

    private fun apply(metadata: JsonObject?) {
        clientId = (metadata?.get("client_id") as? JsonPrimitive)?.contentOrNull
        role = (metadata?.get("role") as? JsonPrimitive)?.contentOrNull

        when {
            clientId == null -> {
                errorMessage = "No client assigned to this account. Ask your Shawcliffe admin to set it up."
                isAuthenticated = false
            }
            role != "client_staff" -> {
                errorMessage = "This account is not a seller account."
                isAuthenticated = false
            }
            else -> {
                isAuthenticated = true
                loadEnabledComponents()
            }
        }
    }
}
