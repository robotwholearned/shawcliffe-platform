package ca.shawcliffe.tomsproduce.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import ca.shawcliffe.tomsproduce.APIClient
import ca.shawcliffe.tomsproduce.Config
import ca.shawcliffe.tomsproduce.Email
import ca.shawcliffe.tomsproduce.Phone
import ca.shawcliffe.tomsproduce.PushManager
import ca.shawcliffe.tomsproduce.SignupRequest
import ca.shawcliffe.tomsproduce.SignupResponse
import kotlinx.coroutines.launch

private const val CONSENT_TEXT = "I agree to receive updates about today's availability, location, and products. " +
    "Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply."

@Composable
fun SignupScreen(onDone: () -> Unit, businessName: String = "Tom's Produce") {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var smsConsent by remember { mutableStateOf(false) }
    var emailConsent by remember { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    var done by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    if (done) {
        BrandedSuccess(
            title = "You're signed up!",
            message = "We'll send you updates from $businessName about today's hours, location, and what's available.",
            onBack = onDone,
        )
        return
    }

    BrandedScaffold(onBack = onDone) {
        CardSection(title = "Stay in the Loop", eyebrow = "Your details", index = 0) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Your name *") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone number") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email address") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        CardSection(eyebrow = "Consent", index = 1) {
            Text(CONSENT_TEXT, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = smsConsent, onCheckedChange = { smsConsent = it })
                Text("Yes, send me text message updates")
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = emailConsent, onCheckedChange = { emailConsent = it })
                Text("Yes, send me email updates")
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }

        BrandedCta(
            text = "Sign Me Up",
            enabled = !submitting && name.trim().isNotEmpty(),
            loading = submitting,
            onClick = {
                error = null
                if (phone.isEmpty() && email.isEmpty()) {
                    error = "Enter a phone number or email."
                    return@BrandedCta
                }
                Phone.error(phone)?.let {
                    error = it
                    return@BrandedCta
                }
                Email.error(email)?.let {
                    error = it
                    return@BrandedCta
                }
                if (!smsConsent && !emailConsent) {
                    error = "Please check at least one consent option."
                    return@BrandedCta
                }
                submitting = true
                scope.launch {
                    try {
                        val response = APIClient.post<SignupRequest, SignupResponse>(
                            "api/signup",
                            SignupRequest(
                                client_id = Config.CLIENT_ID,
                                name = name,
                                phone = phone.ifEmpty { null }?.let { Phone.normalize(it) },
                                email = email.ifEmpty { null },
                                sms_consent = smsConsent,
                                email_consent = emailConsent,
                                signup_source = "app",
                            ),
                        )
                        PushManager.didCompleteSignup(response.id)
                        done = true
                    } catch (e: Exception) {
                        error = e.message
                    }
                    submitting = false
                }
            },
        )
    }
}
