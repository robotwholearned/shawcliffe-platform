import SwiftUI

struct PreordersView: View {
    @ObservedObject var viewModel: DashboardViewModel

    var body: some View {
        List {
            if viewModel.preorders.isEmpty && !viewModel.isLoading {
                Text("No preorders yet.")
                    .foregroundStyle(.secondary)
            }

            ForEach(viewModel.preorders) { detail in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(detail.customer?.name ?? "Unknown customer")
                            .font(.headline)
                        Spacer()
                        StatusBadge(status: detail.preorder.status)
                    }

                    if let phone = detail.customer?.phone {
                        Text(phone).font(.caption).foregroundStyle(.secondary)
                    }

                    ForEach(detail.items, id: \.productName) { item in
                        Text("\(item.quantity)× \(item.productName)")
                            .font(.subheadline)
                    }

                    if let notes = detail.preorder.notes, !notes.isEmpty {
                        Text(notes).font(.caption).italic()
                    }

                    if detail.preorder.status == "pending" {
                        HStack {
                            Button("Confirm") {
                                Task { await viewModel.updatePreorderStatus(detail, status: "confirmed") }
                            }
                            .buttonStyle(.borderedProminent)

                            Button("Cancel", role: .destructive) {
                                Task { await viewModel.updatePreorderStatus(detail, status: "cancelled") }
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(.top, 4)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .overlay {
            if viewModel.isLoading {
                ProgressView()
            }
        }
    }
}

private struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(status.capitalized)
            .font(.caption2.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch status {
        case "pending": return .orange
        case "confirmed": return .green
        case "cancelled": return .red
        case "completed": return .blue
        default: return .gray
        }
    }
}
