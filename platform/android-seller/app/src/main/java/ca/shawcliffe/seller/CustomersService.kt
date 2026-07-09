package ca.shawcliffe.seller

import io.github.jan.supabase.auth.auth
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.statement.HttpResponse
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Reads this client's customers from the web backend, gated server-side on the
// customer_database component (same Bearer-token pattern as ComponentsService).
object CustomersService {
    @Serializable
    data class Response(
        val customers: List<Customer> = emptyList(),
        val total: Int = 0,
        val page: Int = 0,
        val pageSize: Int = 25,
    )

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(q: String? = null, page: Int = 0): Response {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/customers") {
            header("Authorization", "Bearer $token")
            parameter("page", page)
            if (!q.isNullOrBlank()) parameter("q", q)
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load customers.")
        }
        return response.body<Response>()
    }
}
