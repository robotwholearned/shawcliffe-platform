import SwiftUI
import UniformTypeIdentifiers

private enum UploadState {
    case idle, uploading, uploaded, failed(String)
}

struct DocumentChecklistView: View {
    let businessName: String
    var primaryColor: Color = Color(hex: nil)
    var fontDesign: Font.Design = .default

    @State private var items: [DocumentChecklistItem] = []
    @State private var loading = true
    @State private var loadError: String?
    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var smsConsent = false
    @State private var emailConsent = false
    @State private var uploadStates: [String: UploadState] = [:]
    @State private var filePickerItemId: String?
    @State private var contactError: String?

    private static let consentText = "I agree to be contacted about my submission. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply."

    var body: some View {
        Form {
            if loading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }
            } else if let loadError {
                Section {
                    Text(loadError).foregroundStyle(.red).font(.footnote)
                }
            } else if items.isEmpty {
                Section {
                    Text("No checklist items yet.").foregroundStyle(.secondary)
                }
            } else {
                Section("Your details") {
                    TextField("Your name *", text: $name)
                        .textContentType(.name)
                    TextField("Phone number", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Email address", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Text(Self.consentText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Toggle("Yes, send me text message updates", isOn: $smsConsent)
                    Toggle("Yes, send me email updates", isOn: $emailConsent)
                    if let contactError {
                        Text(contactError).foregroundStyle(.red).font(.footnote)
                    }
                }

                Section("Checklist") {
                    ForEach(items) { item in
                        checklistRow(item)
                    }
                }
            }
        }
        .navigationTitle("Documents")
        .navigationBarTitleDisplayMode(.inline)
        .tint(primaryColor)
        .brandedFontDesign(fontDesign)
        .task { await load() }
        .fileImporter(
            isPresented: Binding(get: { filePickerItemId != nil }, set: { if !$0 { filePickerItemId = nil } }),
            allowedContentTypes: [.image, .pdf]
        ) { result in
            guard let itemId = filePickerItemId else { return }
            filePickerItemId = nil
            handlePickedFile(result, itemId: itemId)
        }
    }

    @ViewBuilder
    private func checklistRow(_ item: DocumentChecklistItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(item.title).font(.body.weight(.medium))
                Spacer()
                if item.required {
                    Text("Required").font(.caption2).foregroundStyle(.orange)
                } else {
                    Text("Optional").font(.caption2).foregroundStyle(.secondary)
                }
            }
            if let description = item.description, !description.isEmpty {
                Text(description).font(.caption).foregroundStyle(.secondary)
            }
            if item.needsUpload {
                uploadControl(for: item)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func uploadControl(for item: DocumentChecklistItem) -> some View {
        switch uploadStates[item.id] {
        case .uploaded:
            Label("Uploaded", systemImage: "checkmark.circle.fill").font(.caption).foregroundStyle(.green)
        case .uploading:
            HStack(spacing: 6) { ProgressView().controlSize(.small); Text("Uploading…").font(.caption) }
        case .failed(let message):
            VStack(alignment: .leading, spacing: 2) {
                Text(message).font(.caption).foregroundStyle(.red)
                Button("Try Again") { startUpload(for: item) }.font(.caption)
            }
        case .idle, .none:
            Button("Upload") { startUpload(for: item) }.font(.caption)
        }
    }

    private func startUpload(for item: DocumentChecklistItem) {
        contactError = nil
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else {
            contactError = "Enter your name before uploading."
            return
        }
        guard !phone.isEmpty || !email.isEmpty else {
            contactError = "Enter a phone number or email before uploading."
            return
        }
        if let phoneError = Phone.error(for: phone) {
            contactError = phoneError
            return
        }
        if let emailErr = Email.error(for: email) {
            contactError = emailErr
            return
        }
        filePickerItemId = item.id
    }

    private func handlePickedFile(_ result: Result<URL, Error>, itemId: String) {
        guard let item = items.first(where: { $0.id == itemId }) else { return }
        switch result {
        case .failure(let error):
            uploadStates[itemId] = .failed(error.localizedDescription)
        case .success(let url):
            Task { await upload(fileAt: url, for: item) }
        }
    }

    private func upload(fileAt url: URL, for item: DocumentChecklistItem) async {
        uploadStates[item.id] = .uploading
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }

        guard let data = try? Data(contentsOf: url) else {
            uploadStates[item.id] = .failed("Couldn't read file.")
            return
        }
        let mimeType = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"

        do {
            _ = try await APIClient.submitMultipart(
                path: "api/document-checklist/submit",
                fields: [
                    "client_id": Config.clientId,
                    "name": name,
                    "phone": phone.isEmpty ? "" : (Phone.normalize(phone) ?? ""),
                    "email": email,
                    "sms_consent": smsConsent ? "true" : "false",
                    "email_consent": emailConsent ? "true" : "false",
                    "checklist_item_id": item.id,
                ],
                fileFieldName: "file",
                filename: url.lastPathComponent,
                fileData: data,
                mimeType: mimeType,
                as: DocumentSubmissionResponse.self
            )
            uploadStates[item.id] = .uploaded
        } catch {
            uploadStates[item.id] = .failed(error.localizedDescription)
        }
    }

    private func load() async {
        do {
            let rows: [DocumentChecklistItem] = try await supabase
                .from("document_checklist_items")
                .select()
                .eq("client_id", value: Config.clientId)
                .order("sort_order")
                .execute()
                .value
            items = rows
        } catch {
            loadError = "Couldn't load checklist, try again."
        }
        loading = false
    }
}

#Preview {
    NavigationStack { DocumentChecklistView(businessName: "Tom's Produce") }
}
