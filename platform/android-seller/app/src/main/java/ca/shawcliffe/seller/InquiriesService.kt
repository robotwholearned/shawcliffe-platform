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

// Reads and updates this client's inquiries from the web backend, gated
// server-side on the inquiry_quote_form component (same Bearer-token pattern
// as CustomersService).
object InquiriesService {
    @Serializable
    data class InquiryCustomer(
        val name: String,
        val phone: String? = null,
        val email: String? = null,
    )

    @Serializable
    data class InquiryVehicle(
        val make: String? = null,
        val model: String? = null,
        val year: Int? = null,
        val vin: String? = null,
        val plate: String? = null,
        val mileage: Int? = null,
    )

    @Serializable
    data class Inquiry(
        val id: String,
        @SerialName("service_category") val serviceCategory: String? = null,
        @SerialName("job_location") val jobLocation: String? = null,
        val urgency: String? = null,
        val description: String? = null,
        @SerialName("photo_urls") val photoUrls: List<String> = emptyList(),
        @SerialName("preferred_contact_method") val preferredContactMethod: String? = null,
        val status: String,
        @SerialName("created_at") val createdAt: String,
        val customer: InquiryCustomer? = null,
        val vehicle: InquiryVehicle? = null,
    )

    @Serializable
    data class Response(
        val inquiries: List<Inquiry> = emptyList(),
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

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/inquiries") {
            header("Authorization", "Bearer $token")
            parameter("page", page)
            if (!status.isNullOrBlank()) parameter("status", status)
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load inquiries.")
        }
        return response.body<Response>()
    }

    suspend fun updateStatus(inquiryId: String, status: String) {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.patch("${Config.API_BASE_URL}/api/seller/inquiries/$inquiryId") {
            header("Authorization", "Bearer $token")
            contentType(ContentType.Application.Json)
            setBody(StatusUpdate(status))
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't update inquiry.")
        }
    }
}
