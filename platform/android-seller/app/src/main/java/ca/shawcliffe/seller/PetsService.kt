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

// Reads this client's pets from the web backend, gated server-side on the
// pet_profiles component (same Bearer-token pattern as VehiclesService).
object PetsService {
    @Serializable
    data class PetCustomer(
        val name: String,
        val phone: String? = null,
        val email: String? = null,
    )

    @Serializable
    data class Pet(
        val id: String,
        val name: String? = null,
        val breed: String? = null,
        val size: String? = null,
        val age: String? = null,
        val allergies: String? = null,
        @SerialName("behavior_notes") val behaviorNotes: String? = null,
        @SerialName("grooming_preferences") val groomingPreferences: String? = null,
        @SerialName("vaccination_info") val vaccinationInfo: String? = null,
        @SerialName("emergency_contact") val emergencyContact: String? = null,
        @SerialName("care_instructions") val careInstructions: String? = null,
        @SerialName("photo_url") val photoUrl: String? = null,
        @SerialName("created_at") val createdAt: String,
        val customer: PetCustomer? = null,
    )

    @Serializable
    data class Response(
        val pets: List<Pet> = emptyList(),
        val total: Int = 0,
        val page: Int = 0,
        val pageSize: Int = 25,
    )

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(page: Int = 0): Response {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/pets") {
            header("Authorization", "Bearer $token")
            parameter("page", page)
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load pets.")
        }
        return response.body<Response>()
    }
}
