import SwiftUI

struct BookingsView: View {
    private static let statuses = ["requested", "confirmed", "declined", "completed", "cancelled"]

    @State private var bookings: [Booking] = []
    @State private var total = 0
    @State private var page = 0
    @State private var statusFilter: String?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadTask: Task<Void, Never>?
    private let pageSize = 25

    var body: some View {
        List {
            if bookings.isEmpty && !isLoading {
                Text("No booking requests found.")
                    .foregroundStyle(.secondary)
            }

            ForEach(bookings) { booking in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(booking.service ?? "General booking request").font(.headline)
                        Spacer()
                        statusPicker(for: booking)
                    }
                    if booking.requestedDate != nil || booking.requestedTime != nil {
                        Text([booking.requestedDate, booking.requestedTime].compactMap { $0 }.joined(separator: " — "))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    if let customer = booking.customer {
                        Text(customer.name).font(.subheadline.bold())
                        if let phone = customer.phone {
                            Text(phone).font(.caption).foregroundStyle(.secondary)
                        }
                        if let email = customer.email {
                            Text(email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if let notes = booking.notes {
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

    private func statusPicker(for booking: Booking) -> some View {
        Picker("Status", selection: Binding(
            get: { booking.status },
            set: { newStatus in Task { await updateStatus(booking, to: newStatus) } }
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
            let response = try await BookingsService.fetch(status: statusFilter, page: page)
            guard !Task.isCancelled else { return }
            bookings = response.bookings
            total = response.total
        } catch {
            guard !Task.isCancelled else { return }
            print("BookingsView load failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't load bookings."
        }
    }

    private func updateStatus(_ booking: Booking, to status: String) async {
        do {
            try await BookingsService.updateStatus(bookingId: booking.id, status: status)
            reload()
        } catch {
            print("BookingsView updateStatus failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't update booking."
        }
    }
}

#Preview {
    NavigationStack {
        BookingsView()
            .navigationTitle("Bookings")
    }
}
