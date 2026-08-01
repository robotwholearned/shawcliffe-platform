import SwiftUI

struct VehiclesView: View {
    @State private var vehicles: [Vehicle] = []
    @State private var total = 0
    @State private var page = 0
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadTask: Task<Void, Never>?
    private let pageSize = 25

    var body: some View {
        List {
            if vehicles.isEmpty && !isLoading {
                Text("No vehicles on file yet.")
                    .foregroundStyle(.secondary)
            }

            ForEach(vehicles) { vehicle in
                VStack(alignment: .leading, spacing: 4) {
                    Text([vehicle.year.map(String.init), vehicle.make, vehicle.model].compactMap { $0 }.joined(separator: " "))
                        .font(.headline)
                    if let customer = vehicle.customer {
                        Text(customer.name).font(.subheadline.bold())
                        if let phone = customer.phone {
                            Text(phone).font(.caption).foregroundStyle(.secondary)
                        }
                        if let email = customer.email {
                            Text(email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if let color = vehicle.color {
                        Text(color).font(.caption).foregroundStyle(.secondary)
                    }
                    if let plate = vehicle.plate {
                        Text("Plate \(plate)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let vin = vehicle.vin {
                        Text("VIN \(vin)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let mileage = vehicle.mileage {
                        Text("\(mileage) mi").font(.caption).foregroundStyle(.secondary)
                    }
                    if let notes = vehicle.notes {
                        Text(notes).font(.subheadline)
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
            let response = try await VehiclesService.fetch(page: page)
            guard !Task.isCancelled else { return }
            vehicles = response.vehicles
            total = response.total
        } catch {
            guard !Task.isCancelled else { return }
            print("VehiclesView load failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't load vehicles."
        }
    }
}

#Preview {
    NavigationStack {
        VehiclesView()
            .navigationTitle("Vehicles")
    }
}
