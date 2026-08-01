import SwiftUI

struct PreorderView: View {
    let businessName: String
    let products: [Product]
    var primaryColor: Color = Color(hex: nil)
    var fontDesign: Font.Design = .default

    @State private var quantities: [String: Int] = [:]
    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var notes = ""
    @State private var submitting = false
    @State private var done = false
    @State private var error: String?

    private var selectedItems: [(productId: String, quantity: Int)] {
        quantities.filter { $0.value > 0 }.map { ($0.key, $0.value) }
    }

    private var totalQuantity: Int {
        selectedItems.reduce(0) { $0 + $1.quantity }
    }

    var body: some View {
        Group {
            if done {
                ConfirmationView(
                    title: "Preorder confirmed!",
                    message: "\(businessName) has your reservation. You'll receive a confirmation shortly."
                )
            } else {
                form
            }
        }
        .navigationTitle("Reserve Your Order")
        .navigationBarTitleDisplayMode(.inline)
        .tint(primaryColor)
        .brandedFontDesign(fontDesign)
    }

    private var form: some View {
        Form {
            Section("What would you like?") {
                if products.isEmpty {
                    Text("No products available for preorder right now.")
                        .foregroundStyle(.secondary)
                }
                ForEach(products) { product in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(product.name)
                            if let price = product.price {
                                Text(price, format: .currency(code: "CAD"))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Stepper(
                            "\(quantities[product.id, default: 0])",
                            value: Binding(
                                get: { quantities[product.id, default: 0] },
                                set: { quantities[product.id] = max(0, $0) }
                            ),
                            in: 0...99
                        )
                        .fixedSize()
                    }
                }
            }

            Section("Your details") {
                TextField("Your name *", text: $name)
                    .textContentType(.name)
                TextField("Phone number", text: $phone)
                    .keyboardType(.phonePad)
                TextField("Email address", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Any notes for your order? (optional)", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            if let error {
                Section {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }
            }

            Section {
                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        Spacer()
                        if submitting {
                            ProgressView()
                        } else {
                            Text("Reserve \(totalQuantity) item\(totalQuantity == 1 ? "" : "s")").bold()
                        }
                        Spacer()
                    }
                }
                .disabled(submitting || selectedItems.isEmpty || name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }

    private func submit() async {
        error = nil
        guard !phone.isEmpty || !email.isEmpty else {
            error = "Enter a phone number or email so we can confirm your order."
            return
        }
        if let phoneError = Phone.error(for: phone) {
            error = phoneError
            return
        }
        if let emailErr = Email.error(for: email) {
            error = emailErr
            return
        }
        guard !selectedItems.isEmpty else {
            error = "Select at least one product."
            return
        }

        submitting = true
        do {
            _ = try await APIClient.post(
                path: "api/preorder",
                body: PreorderRequest(
                    client_id: Config.clientId,
                    customer_name: name,
                    customer_phone: phone.isEmpty ? nil : Phone.normalize(phone),
                    customer_email: email.isEmpty ? nil : email,
                    items: selectedItems.map { PreorderItemRequest(product_id: $0.productId, quantity: $0.quantity) },
                    notes: notes.isEmpty ? nil : notes
                ),
                as: PreorderResponse.self
            )
            done = true
        } catch {
            self.error = error.localizedDescription
        }
        submitting = false
    }
}

#Preview {
    NavigationStack { PreorderView(businessName: "Tom's Produce", products: []) }
}
