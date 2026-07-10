import SwiftUI

struct PropertiesView: View {
    @State private var properties: [Property] = []
    @State private var total = 0
    @State private var page = 0
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadTask: Task<Void, Never>?
    private let pageSize = 25

    var body: some View {
        List {
            if properties.isEmpty && !isLoading {
                Text("No properties on file yet.")
                    .foregroundStyle(.secondary)
            }

            ForEach(properties) { property in
                VStack(alignment: .leading, spacing: 4) {
                    Text(property.address ?? "Property").font(.headline)
                    if let customer = property.customer {
                        Text(customer.name).font(.subheadline.bold())
                        if let phone = customer.phone {
                            Text(phone).font(.caption).foregroundStyle(.secondary)
                        }
                        if let email = customer.email {
                            Text(email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if let gateCode = property.gateCode {
                        Text("Gate code: \(gateCode)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let parking = property.parkingInstructions {
                        Text("Parking: \(parking)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let access = property.accessNotes {
                        Text("Access: \(access)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let pets = property.petsOnSite {
                        Text("Pets on site: \(pets)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let day = property.preferredServiceDay {
                        Text("Preferred day: \(day)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let lawn = property.lawnSize {
                        Text("Lawn size: \(lawn)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let snow = property.snowRemovalAreas {
                        Text("Snow removal: \(snow)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let cleaning = property.cleaningInstructions {
                        Text("Cleaning: \(cleaning)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let safety = property.safetyNotes {
                        Text("Safety: \(safety)").font(.caption).foregroundStyle(.secondary)
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
        .onChange(of: page) { _ in reload() }
        .task { reload() }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func reload() {
        loadTask?.cancel()
        loadTask = Task { await load() }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response = try await PropertiesService.fetch(page: page)
            guard !Task.isCancelled else { return }
            properties = response.properties
            total = response.total
        } catch {
            guard !Task.isCancelled else { return }
            print("PropertiesView load failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't load properties."
        }
    }
}

#Preview {
    NavigationStack {
        PropertiesView()
            .navigationTitle("Properties")
    }
}
