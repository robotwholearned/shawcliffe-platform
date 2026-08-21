import SwiftUI

struct StorefrontView: View {
    @StateObject private var viewModel = StorefrontViewModel()

    private var primaryColor: Color {
        Color(hex: viewModel.branding?.primaryColor, default: .blue)
    }

    private var fontDesign: Font.Design {
        viewModel.branding?.fontTheme.design ?? .default
    }

    private var businessName: String {
        viewModel.branding?.appName ?? "Tom's Produce"
    }

    /// Resolves possibly-relative media paths (e.g. "/demo/x.png") against the platform base URL.
    private func mediaURL(_ path: String?) -> URL? {
        guard let path, !path.isEmpty else { return nil }
        if path.hasPrefix("http") { return URL(string: path) }
        return URL(string: path, relativeTo: Config.apiBaseURL)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                headerBand
                VStack(alignment: .leading, spacing: 20) {
                    errorBanner
                    statusCard
                    productsSection
                    actionButtons
                }
                .padding(.horizontal)
                .offset(y: -32)
                .padding(.bottom, -32)
            }
        }
        .background(Color(.systemGroupedBackground))
        .brandedFontDesign(fontDesign)
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
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    // MARK: Error

    @ViewBuilder
    private var errorBanner: some View {
        if let errorMessage = viewModel.errorMessage {
            Text(errorMessage).foregroundStyle(.red).font(.footnote)
        }
    }

    // MARK: Header band

    @ViewBuilder
    private var headerBand: some View {
        HStack(spacing: 14) {
            logoTile
            VStack(alignment: .leading, spacing: 2) {
                Text(businessName)
                    .font(.title2.bold())
                    .foregroundStyle(.white)
                if let tagline = viewModel.branding?.tagline {
                    Text(tagline)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.75))
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal)
        .padding(.top, 12)
        .padding(.bottom, 56)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            ZStack {
                primaryColor
                if let heroUrl = mediaURL(viewModel.branding?.heroPhotoUrls.first) {
                    AsyncImage(url: heroUrl) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.clear
                    }
                    Color.black.opacity(0.5)
                }
            }
            .clipped()
            .ignoresSafeArea(edges: .top)
        }
    }

    @ViewBuilder
    private var logoTile: some View {
        if let logo = bundledBrandLogo(slug: Config.slug) {
            logo.resizable().aspectRatio(contentMode: .fit)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        } else if let logoUrl = mediaURL(viewModel.branding?.logoUrl) {
            AsyncImage(url: logoUrl) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Color.clear
            }
            .padding(4)
            .frame(width: 56, height: 56)
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
        } else {
            Text(String(businessName.prefix(1)).uppercased())
                .font(.title2.bold())
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))
        }
    }

    // MARK: Status card

    private var showStatus: Bool {
        viewModel.enabledComponents.contains(ComponentKeys.statusTracker)
    }

    @ViewBuilder
    private var statusCard: some View {
        if showStatus || viewModel.location != nil {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top) {
                    if showStatus {
                        statusRow
                    } else if let location = viewModel.location {
                        Text(location.displayName).font(.subheadline.bold())
                    }
                    Spacer()
                    if let open = viewModel.status?.hoursOpen, let close = viewModel.status?.hoursClose {
                        Text("\(open) – \(close)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                }

                if let location = viewModel.location {
                    if showStatus {
                        Divider().padding(.vertical, 12)
                        Text(location.displayName)
                            .font(.subheadline.bold())
                            .padding(.bottom, 2)
                    } else {
                        Spacer().frame(height: 6)
                    }
                    if let address = location.address {
                        Link(destination: mapURL(for: location)) {
                            Text("\(address) →")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(primaryColor)
                        }
                    }
                    if let parking = location.parkingNotes, !parking.isEmpty {
                        Text(parking)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .padding(.top, 2)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
        }
    }

    @ViewBuilder
    private var statusRow: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                if let status = viewModel.status?.status {
                    Circle()
                        .fill(Color(red: status.color.r, green: status.color.g, blue: status.color.b))
                        .frame(width: 10, height: 10)
                    Text(status.label)
                        .font(.headline)
                        .foregroundStyle(Color(red: status.color.r, green: status.color.g, blue: status.color.b))
                } else {
                    Circle().fill(Color(.systemGray4)).frame(width: 10, height: 10)
                    Text("No update yet today")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }
            }
            if let message = viewModel.status?.customMessage, !message.isEmpty {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.leading, 20)
            }
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

    // MARK: Products

    @ViewBuilder
    private var productsSection: some View {
        if !viewModel.products.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 12) {
                    Text("TODAY'S PRODUCTS")
                        .font(.caption.bold())
                        .kerning(1.2)
                        .foregroundStyle(.secondary)
                    Rectangle()
                        .fill(Color(.separator).opacity(0.5))
                        .frame(height: 1)
                }
                VStack(spacing: 0) {
                    ForEach(Array(viewModel.products.enumerated()), id: \.element.id) { index, product in
                        ProductRow(product: product, tint: primaryColor)
                        if index < viewModel.products.count - 1 {
                            Divider().padding(.leading, 60)
                        }
                    }
                }
                .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
            }
        } else if viewModel.status?.status == .open {
            Text("No products listed yet.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
        }
    }

    // MARK: CTAs

    @ViewBuilder
    private var actionButtons: some View {
        VStack(spacing: 12) {
            NavigationLink {
                SignupView(businessName: businessName, primaryColor: primaryColor, fontDesign: fontDesign, branding: viewModel.branding)
            } label: {
                Text("Get Updates")
                    .bold()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .tint(primaryColor)

            NavigationLink {
                PreorderView(businessName: businessName, products: viewModel.products, primaryColor: primaryColor, fontDesign: fontDesign, branding: viewModel.branding)
            } label: {
                Text("Reserve an Order →")
                    .font(.subheadline.bold())
                    .foregroundStyle(primaryColor)
            }

            if viewModel.enabledComponents.contains(ComponentKeys.inquiryQuoteForm) {
                NavigationLink {
                    QuoteView(
                        businessName: businessName,
                        showPhotoUpload: viewModel.enabledComponents.contains(ComponentKeys.photoFileUpload),
                        showVehicleFields: viewModel.enabledComponents.contains(ComponentKeys.vehicleProfiles),
                        showPropertyFields: viewModel.enabledComponents.contains(ComponentKeys.propertyProfiles),
                        primaryColor: primaryColor,
                        fontDesign: fontDesign,
                        branding: viewModel.branding
                    )
                } label: {
                    Text("Get a Quote").bold().frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(primaryColor)
            }

            if viewModel.enabledComponents.contains(ComponentKeys.bookingRequestSystem) {
                NavigationLink {
                    BookingView(
                        businessName: businessName,
                        showPetFields: viewModel.enabledComponents.contains(ComponentKeys.petProfiles),
                        primaryColor: primaryColor,
                        fontDesign: fontDesign,
                        branding: viewModel.branding
                    )
                } label: {
                    Text("Request a Booking").bold().frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(primaryColor)
            }

            if viewModel.enabledComponents.contains(ComponentKeys.documentChecklistIntake) {
                NavigationLink {
                    DocumentChecklistView(businessName: businessName, primaryColor: primaryColor, fontDesign: fontDesign, branding: viewModel.branding)
                } label: {
                    Text("Documents").bold().frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(primaryColor)
            }
        }
        .padding(.top, 4)
    }
}

private struct ProductRow: View {
    let product: Product
    let tint: Color

    private var soldOut: Bool { product.status == .soldOut }

    var body: some View {
        HStack(spacing: 12) {
            Text(String(product.name.prefix(1)).uppercased())
                .font(.subheadline.bold())
                .foregroundStyle(tint)
                .frame(width: 40, height: 40)
                .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))

            Text(product.name)
                .font(.subheadline.weight(.semibold))
                .strikethrough(soldOut)
                .foregroundStyle(soldOut ? .secondary : .primary)

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                if let price = product.price {
                    Text(price, format: .currency(code: "CAD"))
                        .font(.subheadline.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(soldOut ? .secondary : .primary)
                }
                Text(label)
                    .font(.caption2.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(color.opacity(0.12), in: Capsule())
                    .foregroundStyle(color)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .opacity(soldOut ? 0.6 : 1)
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
        case .low: return .orange
        case .soldOut: return .gray
        }
    }
}

#Preview {
    NavigationStack { StorefrontView() }
}
