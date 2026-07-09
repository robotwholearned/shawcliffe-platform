import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @StateObject private var viewModel: DashboardViewModel
    private let clientId: String

    init(clientId: String) {
        self.clientId = clientId
        _viewModel = StateObject(wrappedValue: DashboardViewModel(clientId: clientId))
    }

    var body: some View {
        TabView {
            NavigationStack {
                StatusAndProductsView(viewModel: viewModel)
                    .navigationTitle("Dashboard")
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Sign Out") { Task { await auth.signOut() } }
                        }
                    }
            }
            .tabItem { Label("Dashboard", systemImage: "house") }

            NavigationStack {
                PreordersView(viewModel: viewModel)
                    .navigationTitle("Preorders")
            }
            .tabItem { Label("Preorders", systemImage: "bag") }

            NavigationStack {
                BroadcastView(viewModel: viewModel, clientId: clientId)
                    .navigationTitle("Broadcast")
            }
            .tabItem { Label("Broadcast", systemImage: "megaphone") }

            NavigationStack {
                PreviewView(clientId: clientId)
                    .navigationTitle("Preview")
            }
            .tabItem { Label("Preview", systemImage: "storefront") }

            if auth.enabledComponents.contains(ComponentKeys.customerDatabase) {
                NavigationStack {
                    CustomersView()
                        .navigationTitle("Customers")
                }
                .tabItem { Label("Customers", systemImage: "person.2") }
            }

            if auth.enabledComponents.contains(ComponentKeys.inquiryQuoteForm) {
                NavigationStack {
                    InquiriesView()
                        .navigationTitle("Inquiries")
                }
                .tabItem { Label("Inquiries", systemImage: "envelope") }
            }
        }
        .task {
            await viewModel.loadAll()
        }
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }
}

#Preview {
    DashboardView(clientId: "preview-client-id").environmentObject(AuthViewModel())
}
