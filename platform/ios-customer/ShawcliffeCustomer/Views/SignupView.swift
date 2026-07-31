import SwiftUI

struct SignupView: View {
    let businessName: String
    var primaryColor: Color = Color(hex: nil)
    var fontDesign: Font.Design = .default
    var branding: ClientBranding? = nil

    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var smsConsent = false
    @State private var emailConsent = false
    @State private var submitting = false
    @State private var done = false
    @State private var error: String?

    private static let consentText = "I agree to receive updates about today's availability, location, and products. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply."

    var body: some View {
        BrandedScreen(businessName: businessName, branding: branding, primaryColor: primaryColor) {
            if done {
                BrandedSuccessView(
                    businessName: businessName,
                    branding: branding,
                    title: "You're signed up!",
                    message: "We'll send you updates from \(businessName) about today's hours, location, and what's available."
                )
            } else {
                formCards
            }
        }
        .navigationTitle("Stay in the Loop")
        .navigationBarTitleDisplayMode(.inline)
        .tint(primaryColor)
        .brandedFontDesign(fontDesign)
    }

    @ViewBuilder
    private var formCards: some View {
        CardSection(title: "Your details", index: 0) {
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
        }

        CardSection(index: 1) {
            Text(Self.consentText)
                .font(.caption)
                .foregroundStyle(.secondary)
            Toggle("Yes, send me text message updates", isOn: $smsConsent)
            Toggle("Yes, send me email updates", isOn: $emailConsent)
        }

        if let error {
            Text(error)
                .foregroundStyle(.red)
                .font(.footnote)
                .frame(maxWidth: .infinity, alignment: .leading)
        }

        BrandedSubmitButton(
            title: "Sign Me Up",
            loading: submitting,
            disabled: submitting || name.trimmingCharacters(in: .whitespaces).isEmpty
        ) {
            Task { await submit() }
        }
    }

    private func submit() async {
        error = nil
        guard !phone.isEmpty || !email.isEmpty else {
            error = "Enter a phone number or email."
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
        guard smsConsent || emailConsent else {
            error = "Please check at least one consent option."
            return
        }

        submitting = true
        do {
            let response = try await APIClient.post(
                path: "api/signup",
                body: SignupRequest(
                    client_id: Config.clientId,
                    name: name,
                    phone: phone.isEmpty ? nil : Phone.normalize(phone),
                    email: email.isEmpty ? nil : email,
                    sms_consent: smsConsent,
                    email_consent: emailConsent,
                    signup_source: "app"
                ),
                as: SignupResponse.self
            )
            PushManager.shared.didCompleteSignup(customerId: response.id)
            done = true
        } catch {
            self.error = error.localizedDescription
        }
        submitting = false
    }
}

#Preview {
    NavigationStack { SignupView(businessName: "Tom's Produce") }
}
