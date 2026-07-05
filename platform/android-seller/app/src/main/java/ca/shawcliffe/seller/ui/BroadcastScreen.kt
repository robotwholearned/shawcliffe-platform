package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.BroadcastResponse
import ca.shawcliffe.seller.DashboardViewModel
import ca.shawcliffe.seller.TestSendResult

data class MessageTemplate(val label: String, val sms: String, val subject: String, val email: String)

val messageTemplates = listOf(
    MessageTemplate("We're open", "We're open today! Come see us at the usual spot.", "We're open today!", "We're open today! Come see us at the usual spot."),
    MessageTemplate("Fresh stock today", "Fresh stock just arrived — come grab some while it lasts!", "Fresh stock today", "Fresh stock just arrived today. Come grab some while it lasts!"),
    MessageTemplate("Closing soon", "Closing soon today — last call if you want to stop by!", "Closing soon today", "We're closing soon today — last call if you want to stop by!"),
    MessageTemplate("Sold out", "We're sold out for today. Thanks for a great day — see you next time!", "Sold out for today", "We're sold out for today. Thanks for a great day — see you next time!"),
    MessageTemplate("Restocked", "Just restocked! Fresh items now available.", "We just restocked!", "Just restocked! Fresh items are now available."),
)

@Composable
private fun TemplateChips(onSelect: (MessageTemplate) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        items(messageTemplates) { template ->
            OutlinedButton(onClick = { onSelect(template) }) {
                Text(template.label, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
fun BroadcastScreen(viewModel: DashboardViewModel, clientId: String, modifier: Modifier = Modifier) {
    var smsMessage by remember { mutableStateOf("") }
    var emailSubject by remember { mutableStateOf("") }
    var emailMessage by remember { mutableStateOf("") }
    var pushMessage by remember { mutableStateOf("") }
    var showLog by remember { mutableStateOf(false) }

    if (showLog) {
        Column(modifier = modifier.fillMaxSize()) {
            TextButton(onClick = { showLog = false }) { Text("← Back") }
            NotificationLogScreen(clientId, Modifier.fillMaxSize())
        }
        return
    }

    LazyColumn(modifier = modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        item {
            TextButton(onClick = { showLog = true }) { Text("View Sent Notifications") }
        }
        item {
            Text("Send SMS to Customers", style = MaterialTheme.typography.titleSmall)
            TemplateChips { template -> smsMessage = template.sms }
            OutlinedTextField(
                value = smsMessage,
                onValueChange = { smsMessage = it },
                modifier = Modifier.fillMaxWidth().height(100.dp),
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${smsMessage.length}/160", style = MaterialTheme.typography.labelSmall)
                viewModel.smsResult?.let { ResultLabel(it) }
            }
            if (viewModel.testResult?.channel == "sms") TestResultLabel(viewModel.testResult!!)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { viewModel.sendSMSBroadcast(smsMessage) },
                    enabled = !viewModel.isSendingSMS && smsMessage.trim().isNotEmpty() && smsMessage.length <= 160,
                    modifier = Modifier.weight(1f),
                ) {
                    if (viewModel.isSendingSMS) CircularProgressIndicator(modifier = Modifier.height(20.dp))
                    else Text("Send SMS to All Customers")
                }
                OutlinedButton(
                    onClick = { viewModel.sendTest("sms", smsMessage, "", "", "") },
                    enabled = !viewModel.isSendingTest,
                ) {
                    Text("Test")
                }
            }
        }

        item { HorizontalDivider() }

        item {
            Text("Send Email to Customers", style = MaterialTheme.typography.titleSmall)
            TemplateChips { template ->
                emailSubject = template.subject
                emailMessage = template.email
            }
            OutlinedTextField(
                value = emailSubject,
                onValueChange = { emailSubject = it },
                label = { Text("Subject line") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = emailMessage,
                onValueChange = { emailMessage = it },
                modifier = Modifier.fillMaxWidth().height(120.dp),
            )
            viewModel.emailResult?.let { ResultLabel(it) }
            if (viewModel.testResult?.channel == "email") TestResultLabel(viewModel.testResult!!)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { viewModel.sendEmailBroadcast(emailSubject, emailMessage) },
                    enabled = !viewModel.isSendingEmail && emailSubject.trim().isNotEmpty() && emailMessage.trim().isNotEmpty(),
                    modifier = Modifier.weight(1f),
                ) {
                    if (viewModel.isSendingEmail) CircularProgressIndicator(modifier = Modifier.height(20.dp))
                    else Text("Send Email to All Customers")
                }
                OutlinedButton(
                    onClick = { viewModel.sendTest("email", "", emailSubject, emailMessage, "") },
                    enabled = !viewModel.isSendingTest,
                ) {
                    Text("Test")
                }
            }
        }

        item { HorizontalDivider() }

        item {
            Text("Send Push Notification", style = MaterialTheme.typography.titleSmall)
            OutlinedTextField(
                value = pushMessage,
                onValueChange = { pushMessage = it },
                modifier = Modifier.fillMaxWidth().height(80.dp),
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Only reaches customers with the app installed", style = MaterialTheme.typography.labelSmall)
                viewModel.pushResult?.let { ResultLabel(it) }
            }
            if (viewModel.testResult?.channel == "push") TestResultLabel(viewModel.testResult!!)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { viewModel.sendPushBroadcast(pushMessage) },
                    enabled = !viewModel.isSendingPush && pushMessage.trim().isNotEmpty(),
                    modifier = Modifier.weight(1f),
                ) {
                    if (viewModel.isSendingPush) CircularProgressIndicator(modifier = Modifier.height(20.dp))
                    else Text("Send Push to All Customers")
                }
                OutlinedButton(
                    onClick = { viewModel.sendTest("push", "", "", "", pushMessage) },
                    enabled = !viewModel.isSendingTest,
                ) {
                    Text("Test")
                }
            }
        }
    }
}

@Composable
private fun TestResultLabel(result: TestSendResult) {
    Text(
        result.message,
        color = if (result.ok) androidx.compose.ui.graphics.Color(0xFF2A7A3B) else MaterialTheme.colorScheme.error,
        style = MaterialTheme.typography.labelSmall,
    )
}

@Composable
private fun ResultLabel(result: BroadcastResponse) {
    if (result.failed > 0) {
        Text(
            result.errors?.firstOrNull() ?: "${result.failed} failed",
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.labelSmall,
        )
    } else {
        Text(
            "Sent to ${result.sent} customer${if (result.sent == 1) "" else "s"}",
            color = androidx.compose.ui.graphics.Color(0xFF2A7A3B),
            style = MaterialTheme.typography.labelSmall,
        )
    }
}
