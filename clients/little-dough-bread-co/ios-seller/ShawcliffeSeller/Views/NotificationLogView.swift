import SwiftUI

struct NotificationLogView: View {
    @StateObject private var viewModel: NotificationLogViewModel

    init(clientId: String) {
        _viewModel = StateObject(wrappedValue: NotificationLogViewModel(clientId: clientId))
    }

    var body: some View {
        List {
            if viewModel.entries.isEmpty && !viewModel.isLoading {
                Text("No notifications sent yet.")
                    .foregroundStyle(.secondary)
            }
            ForEach(viewModel.entries) { entry in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(entry.channel.uppercased())
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                        Text(entry.status)
                            .font(.caption.bold())
                            .foregroundStyle(entry.status == "failed" ? .red : .green)
                        Spacer()
                        Text(entry.sentAt.formattedNotificationDate)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(entry.messagePreview ?? "—")
                        .font(.subheadline)
                }
                .padding(.vertical, 2)
            }
        }
        .overlay {
            if viewModel.isLoading && viewModel.entries.isEmpty {
                ProgressView()
            }
        }
        .task { await viewModel.load() }
        .navigationTitle("Sent Notifications")
    }
}

private extension String {
    var formattedNotificationDate: String {
        guard let date = ISO8601DateFormatter.notificationParser.date(from: self) else { return self }
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

private extension ISO8601DateFormatter {
    static let notificationParser: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}

#Preview {
    NavigationStack { NotificationLogView(clientId: "preview-client-id") }
}
