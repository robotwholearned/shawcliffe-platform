import SwiftUI

struct SignupView: View {
    let businessName: String
    var primaryColor: Color = Color(hex: nil)
    var fontDesign: Font.Design = .default

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
        Group {
            if done {
                ConfirmationView(
                    title: "You're signed up!",
                    message: "We'll send you updates from \(businessName) about today's hours, location, and what's available."
                )
            } else {
                form
            }
        }
        .navigationTitle("Stay in the Loop")
        .navigationBarTitleDisplayMode(.inline)
        .tint(primaryColor)
        .brandedFontDesign(fontDesign)
    }

    private var form: some View {
        Form {
            Section {
                TextField("Your name *", text: $name)
                    .textContentType(.name)
                TextField("Phone number", text: $phone)
                    .keyboardType(.phonePad)
                TextField("Email address", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }

            Section {
                Text(Self.consentText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Toggle("Yes, send me text message updates", isOn: $smsConsent)
                Toggle("Yes, send me email updates", isOn: $emailConsent)
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
                            Text("Sign Me Up").bold()
                        }
                        Spacer()
                    }
                }
                .disabled(submitting || name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
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

struct ConfirmationView: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Text("✓").font(.system(size: 48))
            Text(title).font(.title2.bold())
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    NavigationStack { SignupView(businessName: "Tom's Produce") }
}
