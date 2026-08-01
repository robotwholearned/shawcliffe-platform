import SwiftUI

struct InquiriesView: View {
    private static let statuses = ["new", "contacted", "quoted", "won", "lost"]

    @State private var inquiries: [Inquiry] = []
    @State private var total = 0
    @State private var page = 0
    @State private var statusFilter: String?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadTask: Task<Void, Never>?
    private let pageSize = 25

    var body: some View {
        List {
            if inquiries.isEmpty && !isLoading {
                Text("No inquiries found.")
                    .foregroundStyle(.secondary)
            }

            ForEach(inquiries) { inquiry in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(inquiry.serviceCategory ?? "General inquiry").font(.headline)
                        Spacer()
                        statusPicker(for: inquiry)
                    }
                    if let location = inquiry.jobLocation {
                        Text(location).font(.caption).foregroundStyle(.secondary)
                    }
                    if let urgency = inquiry.urgency {
                        Text(urgency.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    if let description = inquiry.description {
                        Text(description).font(.subheadline)
                    }
                    if !inquiry.photoUrls.isEmpty {
                        Text("\(inquiry.photoUrls.count) photos").font(.caption).foregroundStyle(.secondary)
                    }
                    if let vehicle = inquiry.vehicle {
                        Text("🚗 \([vehicle.year.map(String.init), vehicle.make, vehicle.model].compactMap { $0 }.joined(separator: " "))")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    if let property = inquiry.property {
                        Text("🏠 \(property.address ?? "Property on file")")
                            .font(.caption).foregroundStyle(.secondary)
                        if let gateCode = property.gateCode {
                            Text("Gate code: \(gateCode)").font(.caption2).foregroundStyle(.secondary)
                        }
                        if let accessNotes = property.accessNotes {
                            Text("Access: \(accessNotes)").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    if let customer = inquiry.customer {
                        Text(customer.name).font(.subheadline.bold())
                        if let phone = customer.phone {
                            Text(phone).font(.caption).foregroundStyle(.secondary)
                        }
                        if let email = customer.email {
                            Text(email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if let contact = inquiry.preferredContactMethod {
                        Text("Prefers \(contact)").font(.caption2).foregroundStyle(.secondary)
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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Picker("Status", selection: $statusFilter) {
                    Text("All").tag(String?.none)
                    ForEach(Self.statuses, id: \.self) { status in
                        Text(status.capitalized).tag(String?.some(status))
                    }
                }
                .pickerStyle(.menu)
            }
        }
        .onChange(of: statusFilter) { _ in page = 0; reload() }
        .onChange(of: page) { _ in reload() }
        .task { reload() }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func statusPicker(for inquiry: Inquiry) -> some View {
        Picker("Status", selection: Binding(
            get: { inquiry.status },
            set: { newStatus in Task { await updateStatus(inquiry, to: newStatus) } }
        )) {
            ForEach(Self.statuses, id: \.self) { status in
                Text(status.capitalized).tag(status)
            }
        }
        .pickerStyle(.menu)
        .font(.caption)
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
            let response = try await InquiriesService.fetch(status: statusFilter, page: page)
            guard !Task.isCancelled else { return }
            inquiries = response.inquiries
            total = response.total
        } catch {
            guard !Task.isCancelled else { return }
            print("InquiriesView load failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't load inquiries."
        }
    }

    private func updateStatus(_ inquiry: Inquiry, to status: String) async {
        do {
            try await InquiriesService.updateStatus(inquiryId: inquiry.id, status: status)
            reload()
        } catch {
            print("InquiriesView updateStatus failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't update inquiry."
        }
    }
}

#Preview {
    NavigationStack {
        InquiriesView()
            .navigationTitle("Inquiries")
    }
}
