import SwiftUI

struct PetsView: View {
    @State private var pets: [Pet] = []
    @State private var total = 0
    @State private var page = 0
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadTask: Task<Void, Never>?
    private let pageSize = 25

    var body: some View {
        List {
            if pets.isEmpty && !isLoading {
                Text("No pets on file yet.")
                    .foregroundStyle(.secondary)
            }

            ForEach(pets) { pet in
                HStack(alignment: .top, spacing: 12) {
                    if let photoUrlString = pet.photoUrl, let photoUrl = URL(string: photoUrlString) {
                        AsyncImage(url: photoUrl) { image in
                            image.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Color.secondary.opacity(0.1)
                        }
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    VStack(alignment: .leading, spacing: 4) {
                    Text([pet.name, pet.breed].compactMap { $0 }.joined(separator: " — "))
                        .font(.headline)
                    if let customer = pet.customer {
                        Text(customer.name).font(.subheadline.bold())
                        if let phone = customer.phone {
                            Text(phone).font(.caption).foregroundStyle(.secondary)
                        }
                        if let email = customer.email {
                            Text(email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    HStack(spacing: 8) {
                        if let size = pet.size { Text(size).font(.caption).foregroundStyle(.secondary) }
                        if let age = pet.age { Text(age).font(.caption).foregroundStyle(.secondary) }
                    }
                    if let allergies = pet.allergies {
                        Text("Allergies: \(allergies)").font(.caption).foregroundStyle(.red)
                    }
                    if let behaviorNotes = pet.behaviorNotes {
                        Text(behaviorNotes).font(.subheadline)
                    }
                    if let grooming = pet.groomingPreferences {
                        Text("Grooming: \(grooming)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let vaccination = pet.vaccinationInfo {
                        Text("Vaccinations: \(vaccination)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let emergencyContact = pet.emergencyContact {
                        Text("Emergency contact: \(emergencyContact)").font(.caption).foregroundStyle(.secondary)
                    }
                    if let careInstructions = pet.careInstructions {
                        Text("Care: \(careInstructions)").font(.caption).foregroundStyle(.secondary)
                    }
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
            let response = try await PetsService.fetch(page: page)
            guard !Task.isCancelled else { return }
            pets = response.pets
            total = response.total
        } catch {
            guard !Task.isCancelled else { return }
            print("PetsView load failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't load pets."
        }
    }
}

#Preview {
    NavigationStack {
        PetsView()
            .navigationTitle("Pets")
    }
}
