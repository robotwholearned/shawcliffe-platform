import SwiftUI

struct MessageTemplate {
    let label: String
    let sms: String
    let subject: String
    let email: String
}

let messageTemplates: [MessageTemplate] = [
    MessageTemplate(label: "We're open", sms: "We're open today! Come see us at the usual spot.", subject: "We're open today!", email: "We're open today! Come see us at the usual spot."),
    MessageTemplate(label: "Fresh stock today", sms: "Fresh stock just arrived — come grab some while it lasts!", subject: "Fresh stock today", email: "Fresh stock just arrived today. Come grab some while it lasts!"),
    MessageTemplate(label: "Closing soon", sms: "Closing soon today — last call if you want to stop by!", subject: "Closing soon today", email: "We're closing soon today — last call if you want to stop by!"),
    MessageTemplate(label: "Sold out", sms: "We're sold out for today. Thanks for a great day — see you next time!", subject: "Sold out for today", email: "We're sold out for today. Thanks for a great day — see you next time!"),
    MessageTemplate(label: "Restocked", sms: "Just restocked! Fresh items now available.", subject: "We just restocked!", email: "Just restocked! Fresh items are now available."),
]

struct BroadcastView: View {
    @ObservedObject var viewModel: DashboardViewModel
    let clientId: String
    @State private var smsMessage = ""
    @State private var emailSubject = ""
    @State private var emailMessage = ""
    @State private var pushMessage = ""

    var body: some View {
        List {
            Section {
                NavigationLink("View Sent Notifications") {
                    NotificationLogView(clientId: clientId)
                }
            }

            Section {
                TemplateChips { template in
                    smsMessage = template.sms
                }
                TextEditor(text: $smsMessage)
                    .frame(minHeight: 90)
                HStack {
                    Text("\(smsMessage.count)/160")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    if let result = viewModel.smsResult {
                        ResultLabel(result: result)
                    }
                }
                if viewModel.testResult?.channel == "sms" {
                    TestResultLabel(result: viewModel.testResult!)
                }
                HStack {
                    Button {
                        Task { await viewModel.sendSMSBroadcast(message: smsMessage) }
                    } label: {
                        HStack {
                            Spacer()
                            if viewModel.isSendingSMS {
                                ProgressView().tint(.white)
                            } else {
                                Text("Send SMS to All Customers").bold()
                            }
                            Spacer()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.isSendingSMS || smsMessage.trimmingCharacters(in: .whitespaces).isEmpty || smsMessage.count > 160)

                    Button("Test") {
                        Task { await viewModel.sendTest(channel: "sms", smsMessage: smsMessage, emailSubject: "", emailMessage: "", pushMessage: "") }
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isSendingTest)
                }
            } header: {
                Text("Send SMS to Customers")
            }

            Section {
                TemplateChips { template in
                    emailSubject = template.subject
                    emailMessage = template.email
                }
                TextField("Subject line", text: $emailSubject)
                TextEditor(text: $emailMessage)
                    .frame(minHeight: 120)
                if let result = viewModel.emailResult {
                    ResultLabel(result: result)
                }
                if viewModel.testResult?.channel == "email" {
                    TestResultLabel(result: viewModel.testResult!)
                }
                HStack {
                    Button {
                        Task { await viewModel.sendEmailBroadcast(subject: emailSubject, message: emailMessage) }
                    } label: {
                        HStack {
                            Spacer()
                            if viewModel.isSendingEmail {
                                ProgressView().tint(.white)
                            } else {
                                Text("Send Email to All Customers").bold()
                            }
                            Spacer()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(
                        viewModel.isSendingEmail ||
                        emailSubject.trimmingCharacters(in: .whitespaces).isEmpty ||
                        emailMessage.trimmingCharacters(in: .whitespaces).isEmpty
                    )

                    Button("Test") {
                        Task { await viewModel.sendTest(channel: "email", smsMessage: "", emailSubject: emailSubject, emailMessage: emailMessage, pushMessage: "") }
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isSendingTest)
                }
            } header: {
                Text("Send Email to Customers")
            }

            Section {
                TextEditor(text: $pushMessage)
                    .frame(minHeight: 70)
                HStack {
                    Text("Only reaches customers with the app installed")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    if let result = viewModel.pushResult {
                        ResultLabel(result: result)
                    }
                }
                if viewModel.testResult?.channel == "push" {
                    TestResultLabel(result: viewModel.testResult!)
                }
                HStack {
                    Button {
                        Task { await viewModel.sendPushBroadcast(message: pushMessage) }
                    } label: {
                        HStack {
                            Spacer()
                            if viewModel.isSendingPush {
                                ProgressView().tint(.white)
                            } else {
                                Text("Send Push to All Customers").bold()
                            }
                            Spacer()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.isSendingPush || pushMessage.trimmingCharacters(in: .whitespaces).isEmpty)

                    Button("Test") {
                        Task { await viewModel.sendTest(channel: "push", smsMessage: "", emailSubject: "", emailMessage: "", pushMessage: pushMessage) }
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isSendingTest)
                }
            } header: {
                Text("Send Push Notification")
            }
        }
        .listStyle(.insetGrouped)
    }
}

private struct TemplateChips: View {
    let onSelect: (MessageTemplate) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(messageTemplates, id: \.label) { template in
                    Button(template.label) { onSelect(template) }
                        .font(.caption)
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                }
            }
        }
        .listRowInsets(EdgeInsets())
        .padding(.horizontal)
        .padding(.vertical, 4)
    }
}

private struct ResultLabel: View {
    let result: BroadcastResponse

    var body: some View {
        if result.failed > 0 {
            Text(result.errors?.first ?? "\(result.failed) failed")
                .font(.caption.bold())
                .foregroundStyle(.red)
        } else {
            Text("Sent to \(result.sent) customer\(result.sent == 1 ? "" : "s")")
                .font(.caption.bold())
                .foregroundStyle(.green)
        }
    }
}

private struct TestResultLabel: View {
    let result: TestSendResult

    var body: some View {
        Text(result.message)
            .font(.caption.bold())
            .foregroundStyle(result.ok ? .green : .red)
    }
}
