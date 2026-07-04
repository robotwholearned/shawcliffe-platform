package ca.shawcliffe.seller.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ca.shawcliffe.seller.BroadcastResponse
import ca.shawcliffe.seller.DashboardViewModel

@Composable
fun BroadcastScreen(viewModel: DashboardViewModel, modifier: Modifier = Modifier) {
    var smsMessage by remember { mutableStateOf("") }
    var emailSubject by remember { mutableStateOf("") }
    var emailMessage by remember { mutableStateOf("") }
    var pushMessage by remember { mutableStateOf("") }

    LazyColumn(modifier = modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        item {
            Text("Send SMS to Customers", style = MaterialTheme.typography.titleSmall)
            OutlinedTextField(
                value = smsMessage,
                onValueChange = { smsMessage = it },
                modifier = Modifier.fillMaxWidth().height(100.dp),
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${smsMessage.length}/160", style = MaterialTheme.typography.labelSmall)
                viewModel.smsResult?.let { ResultLabel(it) }
            }
            Button(
                onClick = { viewModel.sendSMSBroadcast(smsMessage) },
                enabled = !viewModel.isSendingSMS && smsMessage.trim().isNotEmpty() && smsMessage.length <= 160,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (viewModel.isSendingSMS) CircularProgressIndicator(modifier = Modifier.height(20.dp))
                else Text("Send SMS to All Customers")
            }
        }

        item { HorizontalDivider() }

        item {
            Text("Send Email to Customers", style = MaterialTheme.typography.titleSmall)
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
            Button(
                onClick = { viewModel.sendEmailBroadcast(emailSubject, emailMessage) },
                enabled = !viewModel.isSendingEmail && emailSubject.trim().isNotEmpty() && emailMessage.trim().isNotEmpty(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (viewModel.isSendingEmail) CircularProgressIndicator(modifier = Modifier.height(20.dp))
                else Text("Send Email to All Customers")
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
            Button(
                onClick = { viewModel.sendPushBroadcast(pushMessage) },
                enabled = !viewModel.isSendingPush && pushMessage.trim().isNotEmpty(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (viewModel.isSendingPush) CircularProgressIndicator(modifier = Modifier.height(20.dp))
                else Text("Send Push to All Customers")
            }
        }
    }
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
