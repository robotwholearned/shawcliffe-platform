import SwiftUI

struct BroadcastView: View {
    @ObservedObject var viewModel: DashboardViewModel
    @State private var smsMessage = ""
    @State private var emailSubject = ""
    @State private var emailMessage = ""

    var body: some View {
        List {
            Section {
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
            } header: {
                Text("Send SMS to Customers")
            }

            Section {
                TextField("Subject line", text: $emailSubject)
                TextEditor(text: $emailMessage)
                    .frame(minHeight: 120)
                if let result = viewModel.emailResult {
                    ResultLabel(result: result)
                }
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
            } header: {
                Text("Send Email to Customers")
            }
        }
        .listStyle(.insetGrouped)
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
