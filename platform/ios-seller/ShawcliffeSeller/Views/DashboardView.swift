import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @StateObject private var viewModel: DashboardViewModel

    init(clientId: String) {
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
                BroadcastView(viewModel: viewModel)
                    .navigationTitle("Broadcast")
            }
            .tabItem { Label("Broadcast", systemImage: "megaphone") }
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
