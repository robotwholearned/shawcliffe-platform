import SwiftUI

struct StorefrontView: View {
    @StateObject private var viewModel = StorefrontViewModel()

    private var primaryColor: Color {
        Color(hex: viewModel.branding?.primaryColor, default: .blue)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                statusBadge
                locationSection
                hoursSection
                productsSection
                actionButtons
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
            await viewModel.start()
        }
        .onDisappear {
            viewModel.stop()
        }
        .navigationBarTitleDisplayMode(.inline)
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
                Text(viewModel.branding?.appName ?? "Tom's Produce")
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
                    Link(destination: mapURL(for: location)) {
                        Text("\(address) →").font(.subheadline).foregroundStyle(primaryColor)
                    }
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

    private func mapURL(for location: Location) -> URL {
        if let mapUrlString = location.mapUrl, let url = URL(string: mapUrlString) {
            return url
        }
        let query = location.address ?? location.displayName
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return URL(string: "https://maps.google.com/?q=\(encoded)")!
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
                    ProductRow(product: product)
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

    @ViewBuilder
    private var actionButtons: some View {
        HStack(spacing: 12) {
            NavigationLink {
                SignupView(businessName: viewModel.branding?.appName ?? "Tom's Produce")
            } label: {
                Text("Get Updates").bold().frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)

            NavigationLink {
                PreorderView(businessName: viewModel.branding?.appName ?? "Tom's Produce", products: viewModel.products)
            } label: {
                Text("Reserve an Order").bold().frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
        .padding(.top, 8)
    }
}

private struct ProductRow: View {
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
            Text(label)
                .font(.caption.bold())
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(color.opacity(0.15), in: Capsule())
                .foregroundStyle(color)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var label: String {
        switch product.status {
        case .available: return "Available"
        case .low: return "Low"
        case .soldOut: return "Sold Out"
        }
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
    NavigationStack { StorefrontView() }
}
