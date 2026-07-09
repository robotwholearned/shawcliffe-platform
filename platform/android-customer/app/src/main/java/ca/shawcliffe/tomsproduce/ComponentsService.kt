package ca.shawcliffe.tomsproduce

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.statement.HttpResponse
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Reads the client's enabled components from the web backend. This app is
// anonymous/single-tenant, so GET /api/client/{clientId}/components needs no
// auth — just the baked-in Config.CLIENT_ID in the path.
object ComponentsService {
    @Serializable
    private data class Response(val enabled_components: List<String> = emptyList())

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(): List<String> {
        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/client/${Config.CLIENT_ID}/components")
        if (!response.status.isSuccess()) return emptyList()
        return response.body<Response>().enabled_components
    }
}
