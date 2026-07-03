package ca.shawcliffe.tomsproduce

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

sealed class ApiException(message: String) : Exception(message) {
    class Server(message: String) : ApiException(message)
    class ReservationFull(product: String) : ApiException("Sorry, $product is fully reserved. Try a smaller quantity.")
}

/** Calls the Next.js /api routes (signup, preorder, push/register) that the website form and iOS app also use. */
object APIClient {
    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    internal suspend inline fun <reified Body, reified Response> post(path: String, body: Body): Response {
        val response: HttpResponse = client.post("${Config.API_BASE_URL}/$path") {
            contentType(ContentType.Application.Json)
            setBody(body)
        }

        if (!response.status.isSuccess()) {
            val errorBody = runCatching { response.body<ApiErrorBody>() }.getOrNull()
            if (response.status.value == 409) {
                throw ApiException.ReservationFull(errorBody?.product ?: "that item")
            }
            throw ApiException.Server(errorBody?.error ?: "Something went wrong. Please try again.")
        }
        return response.body()
    }
}
