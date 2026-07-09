import SwiftUI

private enum Urgency: String, CaseIterable, Identifiable {
    case asap, thisWeek = "this_week", thisMonth = "this_month", flexible
    var id: String { rawValue }
    var label: String {
        switch self {
        case .asap: return "ASAP"
        case .thisWeek: return "This week"
        case .thisMonth: return "This month"
        case .flexible: return "Flexible"
        }
    }
}

private enum PreferredContact: String, CaseIterable, Identifiable {
    case phone, email, sms
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

struct QuoteView: View {
    let businessName: String

    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var serviceCategory = ""
    @State private var jobLocation = ""
    @State private var description = ""
    @State private var urgency: Urgency = .flexible
    @State private var preferredContact: PreferredContact = .phone
    @State private var smsConsent = false
    @State private var emailConsent = false
    @State private var submitting = false
    @State private var done = false
    @State private var error: String?

    private static let consentText = "I agree to be contacted about my quote request. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply."

    var body: some View {
        Group {
            if done {
                ConfirmationView(
                    title: "Quote request sent!",
                    message: "\(businessName) will get back to you shortly with a quote."
                )
            } else {
                form
            }
        }
        .navigationTitle("Get a Quote")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var form: some View {
        Form {
            Section("Your details") {
                TextField("Your name *", text: $name)
                    .textContentType(.name)
                TextField("Phone number", text: $phone)
                    .keyboardType(.phonePad)
                TextField("Email address", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }

            Section("The job") {
                TextField("Service needed (optional)", text: $serviceCategory)
                TextField("Job location (optional)", text: $jobLocation)
                TextField("Describe what you need (optional)", text: $description, axis: .vertical)
                    .lineLimit(2...4)
                Picker("Urgency", selection: $urgency) {
                    ForEach(Urgency.allCases) { option in
                        Text(option.label).tag(option)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("How should we reach you?") {
                Picker("Preferred contact method", selection: $preferredContact) {
                    ForEach(PreferredContact.allCases) { option in
                        Text(option.label).tag(option)
                    }
                }
                .pickerStyle(.segmented)
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
                            Text("Request Quote").bold()
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
            error = "Enter a phone number or email so we can send you a quote."
            return
        }
        if let phoneError = Phone.error(for: phone) {
            error = phoneError
            return
        }

        submitting = true
        do {
            _ = try await APIClient.post(
                path: "api/inquiry",
                body: InquiryRequest(
                    client_id: Config.clientId,
                    name: name,
                    phone: phone.isEmpty ? nil : Phone.normalize(phone),
                    email: email.isEmpty ? nil : email,
                    sms_consent: smsConsent,
                    email_consent: emailConsent,
                    signup_source: "app",
                    service_category: serviceCategory.isEmpty ? nil : serviceCategory,
                    job_location: jobLocation.isEmpty ? nil : jobLocation,
                    urgency: urgency.rawValue,
                    description: description.isEmpty ? nil : description,
                    preferred_contact_method: preferredContact.rawValue
                ),
                as: InquiryResponse.self
            )
            done = true
        } catch {
            self.error = error.localizedDescription
        }
        submitting = false
    }
}

#Preview {
    NavigationStack { QuoteView(businessName: "Tom's Produce") }
}
