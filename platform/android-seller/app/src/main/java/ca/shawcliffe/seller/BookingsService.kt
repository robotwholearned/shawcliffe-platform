package ca.shawcliffe.seller

import io.github.jan.supabase.auth.auth
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Reads and updates this client's bookings from the web backend, gated
// server-side on the booking_request_system component (same Bearer-token
// pattern as InquiriesService).
object BookingsService {
    @Serializable
    data class BookingCustomer(
        val name: String,
        val phone: String? = null,
        val email: String? = null,
    )

    @Serializable
    data class Booking(
        val id: String,
        val service: String? = null,
        @SerialName("requested_date") val requestedDate: String? = null,
        @SerialName("requested_time") val requestedTime: String? = null,
        val notes: String? = null,
        val status: String,
        @SerialName("created_at") val createdAt: String,
        val customer: BookingCustomer? = null,
    )

    @Serializable
    data class Response(
        val bookings: List<Booking> = emptyList(),
        val total: Int = 0,
        val page: Int = 0,
        val pageSize: Int = 25,
    )

    @Serializable
    private data class StatusUpdate(val status: String)

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(status: String? = null, page: Int = 0): Response {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/bookings") {
            header("Authorization", "Bearer $token")
            parameter("page", page)
            if (!status.isNullOrBlank()) parameter("status", status)
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load bookings.")
        }
        return response.body<Response>()
    }

    suspend fun updateStatus(bookingId: String, status: String) {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.patch("${Config.API_BASE_URL}/api/seller/bookings/$bookingId") {
            header("Authorization", "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(StatusUpdate(status))
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't update booking.")
        }
    }
}
