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

// Reads this client's vehicles from the web backend, gated server-side on
// the vehicle_profiles component (same Bearer-token pattern as
// DocumentSubmissionsService).
object VehiclesService {
    @Serializable
    data class VehicleCustomer(
        val name: String,
        val phone: String? = null,
        val email: String? = null,
    )

    @Serializable
    data class Vehicle(
        val id: String,
        val make: String? = null,
        val model: String? = null,
        val year: Int? = null,
        val vin: String? = null,
        val plate: String? = null,
        val mileage: Int? = null,
        val notes: String? = null,
        @SerialName("created_at") val createdAt: String,
        val customer: VehicleCustomer? = null,
    )

    @Serializable
    data class Response(
        val vehicles: List<Vehicle> = emptyList(),
        val total: Int = 0,
        val page: Int = 0,
        val pageSize: Int = 25,
    )

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun fetch(page: Int = 0): Response {
        val token = supabase.auth.currentAccessTokenOrNull() ?: throw BroadcastError.NotAuthenticated

        val response: HttpResponse = client.get("${Config.API_BASE_URL}/api/seller/vehicles") {
            header("Authorization", "Bearer $token")
            parameter("page", page)
        }
        if (!response.status.isSuccess()) {
            throw BroadcastError.Server("Couldn't load vehicles.")
        }
        return response.body<Response>()
    }
}
