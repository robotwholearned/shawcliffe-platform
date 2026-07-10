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
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Reads this client's document submissions from the web backend, gated
// server-side on the document_checklist_intake component (same Bearer-token
// pattern as BookingsService). No status update — status tracking on
// submissions is Premium-tier scope (Ops Guide 3.21), not built here.
object DocumentSubmissionsService {
    @Serializable
    data class SubmissionCustomer(
        val name: String,
        val phone: String? = null,
        val email: String? = null,
    )

    @Serializable
    data class ChecklistItemRef(val title: String)

    @Serializable
    data class Submission(
        val id: String,
        @SerialName("file_url") val fileUrl: String,
        @SerialName("submitted_at") val submittedAt: String,
        val customer: SubmissionCustomer? = null,
        @SerialName("checklist_item") val checklistItem: ChecklistItemRef? = null,
    )

    @Serializable
    data class Response(
        val submissions: List<Submission> = emptyList(),
        val total: Int = 0,
        val page: Int = 0,
        val pageSize: Int = 25,
    )

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(page: Int = 0): Response {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/document-submissions") {
            header("Authorization", "Bearer $token")
            parameter("page", page)
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load documents.")
        }
        return response.body<Response>()
    }
}
