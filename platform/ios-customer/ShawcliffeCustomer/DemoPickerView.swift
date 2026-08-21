import SwiftUI

/// DEMO_MODE root: an in-app picker of all demo businesses. Tap one to switch the
/// active client (Config.selectDemoClient) and push a fresh StorefrontView, which
/// reads the new Config.clientId when its view model inits. Off in production.
struct DemoPickerView: View {
    // Value-based path (slug per pushed screen) so the back button returns here.
    @State private var path: [String] = []

    var body: some View {
        NavigationStack(path: $path) {
            List(demoClients, id: \.slug) { client in
                Button {
                    Config.selectDemoClient(id: client.id, slug: client.slug)
                    path.append(client.slug)
                } label: {
                    HStack(spacing: 12) {
                        if let logo = bundledBrandLogo(slug: client.slug) {
                            logo.resizable().aspectRatio(contentMode: .fit)
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        } else {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color(hex: client.primaryColorHex))
                                .frame(width: 44, height: 44)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(client.businessName)
                                .font(.headline)
                                .foregroundStyle(.primary)
                            Text(client.tagline)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                }
            }
            .navigationTitle("Shawcliffe Demos")
            // ponytail: one fresh StorefrontView per push; slug value is unused —
            // the client is already selected in the tap handler above. Custom back
            // button ("Businesses") lives here so shared StorefrontView is untouched.
            .navigationDestination(for: String.self) { _ in
                StorefrontView()
                    .navigationBarBackButtonHidden(true)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button {
                                if !path.isEmpty { path.removeLast() }
                            } label: {
                                Label("Businesses", systemImage: "chevron.backward")
                            }
                        }
                    }
            }
        }
    }
}
