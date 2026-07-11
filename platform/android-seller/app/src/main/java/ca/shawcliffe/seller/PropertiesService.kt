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

// Reads this client's properties from the web backend, gated server-side on
// the property_profiles component (same Bearer-token pattern as
// VehiclesService).
object PropertiesService {
    @Serializable
    data class PropertyCustomer(
        val name: String,
        val phone: String? = null,
        val email: String? = null,
    )

    @Serializable
    data class Property(
        val id: String,
        val address: String? = null,
        @SerialName("gate_code") val gateCode: String? = null,
        @SerialName("parking_instructions") val parkingInstructions: String? = null,
        @SerialName("pets_on_site") val petsOnSite: String? = null,
        @SerialName("access_notes") val accessNotes: String? = null,
        @SerialName("preferred_service_day") val preferredServiceDay: String? = null,
        @SerialName("lawn_size") val lawnSize: String? = null,
        @SerialName("snow_removal_areas") val snowRemovalAreas: String? = null,
        @SerialName("cleaning_instructions") val cleaningInstructions: String? = null,
        @SerialName("safety_notes") val safetyNotes: String? = null,
        @SerialName("address_verified") val addressVerified: Boolean = false,
        @SerialName("created_at") val createdAt: String,
        val customer: PropertyCustomer? = null,
    )

    @Serializable
    data class Response(
        val properties: List<Property> = emptyList(),
        val total: Int = 0,
        val page: Int = 0,
        val pageSize: Int = 25,
    )

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(page: Int = 0): Response {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/properties") {
            header("Authorization", "Bearer $token")
            parameter("page", page)
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load properties.")
        }
        return response.body<Response>()
    }
}
