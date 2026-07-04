import SwiftUI

/// Read-only rendition of the customer storefront, scoped to this seller's own client_id.
struct PreviewView: View {
    @StateObject private var viewModel: PreviewViewModel

    init(clientId: String) {
        _viewModel = StateObject(wrappedValue: PreviewViewModel(clientId: clientId))
    }

    private var primaryColor: Color {
        Color(hex: viewModel.branding?.primaryColor, default: .blue)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Text("What customers see")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                    Spacer()
                }

                header
                statusBadge
                locationSection
                hoursSection
                productsSection

                if let error = viewModel.errorMessage {
                    Text(error).font(.footnote).foregroundStyle(.red)
                }
            }
            .padding()
        }
        .tint(primaryColor)
        .overlay {
            if viewModel.isLoading {
                ProgressView()
            }
        }
        .task {
            await viewModel.load()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await viewModel.load() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
    }

    @ViewBuilder
    private var header: some View {
        HStack(spacing: 12) {
            if let logoUrl = viewModel.branding?.logoUrl, let url = URL(string: logoUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fit)
                } placeholder: {
                    Color.clear
                }
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(viewModel.branding?.appName ?? "Your storefront")
                    .font(.title2.bold())
                if let tagline = viewModel.branding?.tagline {
                    Text(tagline)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        if let status = viewModel.status?.status {
            HStack {
                Circle()
                    .fill(Color(red: status.color.r, green: status.color.g, blue: status.color.b))
                    .frame(width: 10, height: 10)
                Text(status.label)
                    .font(.headline)
                if let message = viewModel.status?.customMessage, !message.isEmpty {
                    Text("— \(message)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
        }
    }

    @ViewBuilder
    private var locationSection: some View {
        if let location = viewModel.location {
            VStack(alignment: .leading, spacing: 4) {
                Text(location.displayName).font(.subheadline.bold())
                if let address = location.address {
                    Text(address).font(.subheadline).foregroundStyle(primaryColor)
                }
                if let parking = location.parkingNotes, !parking.isEmpty {
                    Text(parking).font(.caption).foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
        }
    }

    @ViewBuilder
    private var hoursSection: some View {
        if let open = viewModel.status?.hoursOpen, let close = viewModel.status?.hoursClose {
            Text("Hours: \(open) – \(close)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var productsSection: some View {
        if !viewModel.products.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("TODAY'S PRODUCTS")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                ForEach(viewModel.products) { product in
                    PreviewProductRow(product: product)
                }
            }
        } else if viewModel.status?.status == .open {
            Text("No products listed yet.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
        }
    }
}

private struct PreviewProductRow: View {
    let product: Product

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(product.name).font(.body)
                if let price = product.price {
                    Text(price, format: .currency(code: "CAD"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text(product.status.customerLabel)
                .font(.caption.bold())
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(color.opacity(0.15), in: Capsule())
                .foregroundStyle(color)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var color: Color {
        switch product.status {
        case .available: return .green
        case .low: return .yellow
        case .soldOut: return .red
        }
    }
}

#Preview {
    NavigationStack { PreviewView(clientId: "preview-client-id") }
}
