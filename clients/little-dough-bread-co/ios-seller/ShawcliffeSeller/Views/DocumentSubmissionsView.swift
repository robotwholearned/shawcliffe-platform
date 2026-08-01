import SwiftUI

struct DocumentSubmissionsView: View {
    @State private var submissions: [DocumentSubmission] = []
    @State private var total = 0
    @State private var page = 0
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadTask: Task<Void, Never>?
    private let pageSize = 25

    var body: some View {
        List {
            if submissions.isEmpty && !isLoading {
                Text("No documents submitted yet.")
                    .foregroundStyle(.secondary)
            }

            ForEach(submissions) { submission in
                VStack(alignment: .leading, spacing: 4) {
                    Text(submission.checklistItem?.title ?? "General submission").font(.headline)
                    if let customer = submission.customer {
                        Text(customer.name).font(.subheadline.bold())
                        if let phone = customer.phone {
                            Text(phone).font(.caption).foregroundStyle(.secondary)
                        }
                        if let email = customer.email {
                            Text(email).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Link("View file →", destination: URL(string: submission.fileUrl) ?? URL(string: "about:blank")!)
                        .font(.caption)
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
            let response = try await DocumentSubmissionsService.fetch(page: page)
            guard !Task.isCancelled else { return }
            submissions = response.submissions
            total = response.total
        } catch {
            guard !Task.isCancelled else { return }
            print("DocumentSubmissionsView load failed: \(error)")
            errorMessage = (error as? BroadcastError)?.errorDescription ?? "Couldn't load documents."
        }
    }
}

#Preview {
    NavigationStack {
        DocumentSubmissionsView()
            .navigationTitle("Documents")
    }
}
