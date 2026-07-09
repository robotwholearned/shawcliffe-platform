import SwiftUI

struct CustomersView: View {
    @State private var customers: [Customer] = []
    @State private var total = 0
    @State private var page = 0
    @State private var query = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadTask: Task<Void, Never>?
    private let pageSize = 25

    var body: some View {
        List {
            if customers.isEmpty && !isLoading {
                Text("No customers found.")
                    .foregroundStyle(.secondary)
            }

            ForEach(customers) { customer in
                VStack(alignment: .leading, spacing: 4) {
                    Text(customer.name).font(.headline)
                    if let phone = customer.phone {
                        Text(phone).font(.caption).foregroundStyle(.secondary)
                    }
                    if let email = customer.email {
                        Text(email).font(.caption).foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            if total > pageSize {
                HStack {
                    Button("← Prev") { page = max(0, page - 1) }
                        .disabled(page == 0)
                    Spacer()
                    Text("\(page * pageSize + 1)–\(min((page + 1) * pageSize, total)) of \(total)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Next →") { if (page + 1) * pageSize < total { page += 1 } }
                        .disabled((page + 1) * pageSize >= total)
                }
                .buttonStyle(.borderless)
            }
        }
        .overlay {
            if isLoading {
                ProgressView()
            }
        }
        .searchable(text: $query, prompt: "Search name, phone, or email")
        .onChange(of: query) { _ in page = 0; reload() }
        .onChange(of: page) { _ in reload() }
        .task { reload() }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    // Cancels any in-flight load before starting a new one so a slow, superseded
    // request can't land after a newer one and overwrite the list with stale results.
    private func reload() {
        loadTask?.cancel()
        loadTask = Task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response = try await CustomersService.fetch(query: query.isEmpty ? nil : query, page: page)
            guard !Task.isCancelled else { return }
            customers = response.customers
            total = response.total
        } catch {
            guard !Task.isCancelled else { return }
            print("CustomersView load failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't load customers."
        }
    }
}

#Preview {
    NavigationStack {
        CustomersView()
            .navigationTitle("Customers")
    }
}
