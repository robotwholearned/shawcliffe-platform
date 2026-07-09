package ca.shawcliffe.seller

import io.github.jan.supabase.auth.auth
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.HttpResponse
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Reads the current client's enabled components from the web backend.
// clients.enabled_components is service_role_only, so the app can't SELECT it
// directly — GET /api/seller/components returns it, authed with the Bearer token
// (same pattern as BroadcastService). Loaded into AuthViewModel.enabledComponents.
object ComponentsService {
    @Serializable
    private data class Response(val enabled_components: List<String> = emptyList())

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(): List<String> {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/components") {
            header("Authorization", "Bearer $token")
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load enabled components.")
        }
        return response.body<Response>().enabled_components
    }
}
