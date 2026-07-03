package ca.shawcliffe.seller

import io.github.jan.supabase.auth.auth
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

sealed class BroadcastError(message: String) : Exception(message) {
    object NotAuthenticated : BroadcastError("You're not signed in.")
    class Server(message: String) : BroadcastError(message)
}

@Serializable
private data class BroadcastErrorBody(val error: String? = null)

/**
 * Calls the Next.js /api/broadcast/* routes on the deployed web backend.
 * Those routes hold the Twilio/Resend/APNs secrets, so the app never talks
 * to those providers directly — it authenticates with a Bearer access token
 * instead of the cookie session the web app uses (see getAuthedUser in
 * platform/web/src/lib/supabase/server.ts). Mirrors ios-seller/BroadcastService.swift.
 */
object BroadcastService {
    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend inline fun <reified Body> send(path: String, body: Body): BroadcastResponse {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.post("${Config.API_BASE_URL}/$path") {
            contentType(ContentType.Application.Json)
            header("Authorization", "Bearer $token")
            setBody(body)
        }

        if (!response.status.isSuccess()) {
            val message = runCatching { response.body<BroadcastErrorBody>().error }
                .getOrNull() ?: "Request failed (${response.status.value})."
            throw BroadcastError.Server(message)
        }
        return response.body()
    }
}
