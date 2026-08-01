import SwiftUI

struct PreorderView: View {
    let businessName: String
    let products: [Product]
    var primaryColor: Color = Color(hex: nil)
    var fontDesign: Font.Design = .default
    var branding: ClientBranding? = nil

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
        BrandedScreen(businessName: businessName, branding: branding, primaryColor: primaryColor) {
            if done {
                BrandedSuccessView(
                    businessName: businessName,
                    branding: branding,
                    title: "Preorder confirmed!",
                    message: "\(businessName) has your reservation. You'll receive a confirmation shortly."
                )
            } else {
                formCards
            }
        }
        .navigationTitle("Reserve Your Order")
        .navigationBarTitleDisplayMode(.inline)
        .tint(primaryColor)
        .brandedFontDesign(fontDesign)
    }

    @ViewBuilder
    private var formCards: some View {
        CardSection(title: "What would you like?", index: 0) {
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

        CardSection(title: "Your details", index: 1) {
            TextField("Your name *", text: $name)
                .textContentType(.name)
                .brandedField()
            TextField("Phone number", text: $phone)
                .keyboardType(.phonePad)
                .brandedField()
            TextField("Email address", text: $email)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .brandedField()
            TextField("Any notes for your order? (optional)", text: $notes, axis: .vertical)
                .lineLimit(2...4)
                .brandedField()
        }

        if let error {
            Text(error)
                .foregroundStyle(.red)
                .font(.footnote)
                .frame(maxWidth: .infinity, alignment: .leading)
        }

        BrandedSubmitButton(
            title: "Reserve \(totalQuantity) item\(totalQuantity == 1 ? "" : "s")",
            loading: submitting,
            disabled: submitting || selectedItems.isEmpty || name.trimmingCharacters(in: .whitespaces).isEmpty
        ) {
            Task { await submit() }
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
