import SwiftUI

private enum TimePreference: String, CaseIterable, Identifiable {
    case morning, afternoon, evening, flexible
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

struct BookingView: View {
    let businessName: String

    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var service = ""
    @State private var hasPreferredDate = false
    @State private var preferredDate = Date()
    @State private var timePreference: TimePreference = .flexible
    @State private var notes = ""
    @State private var smsConsent = false
    @State private var emailConsent = false
    @State private var submitting = false
    @State private var done = false
    @State private var error: String?

    private static let consentText = "I agree to be contacted about my booking request. Message frequency varies. Reply STOP to unsubscribe. Message & data rates may apply."
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    var body: some View {
        Group {
            if done {
                ConfirmationView(
                    title: "Booking request sent!",
                    message: "\(businessName) will confirm your booking soon."
                )
            } else {
                form
            }
        }
        .navigationTitle("Request a Booking")
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

            Section("The booking") {
                TextField("Service needed (optional)", text: $service)

                Toggle("I have a preferred date", isOn: $hasPreferredDate)
                if hasPreferredDate {
                    DatePicker("Preferred date", selection: $preferredDate, displayedComponents: .date)
                }

                Picker("Preferred time", selection: $timePreference) {
                    ForEach(TimePreference.allCases) { option in
                        Text(option.label).tag(option)
                    }
                }
                .pickerStyle(.segmented)

                TextField("Anything else we should know? (optional)", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
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
                            Text("Request Booking").bold()
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
            error = "Enter a phone number or email so we can confirm your booking."
            return
        }
        if let phoneError = Phone.error(for: phone) {
            error = phoneError
            return
        }

        submitting = true
        do {
            _ = try await APIClient.post(
                path: "api/booking",
                body: BookingRequest(
                    client_id: Config.clientId,
                    name: name,
                    phone: phone.isEmpty ? nil : Phone.normalize(phone),
                    email: email.isEmpty ? nil : email,
                    sms_consent: smsConsent,
                    email_consent: emailConsent,
                    signup_source: "app",
                    service: service.isEmpty ? nil : service,
                    requested_date: hasPreferredDate ? Self.dateFormatter.string(from: preferredDate) : nil,
                    requested_time: timePreference.rawValue,
                    notes: notes.isEmpty ? nil : notes
                ),
                as: BookingResponse.self
            )
            done = true
        } catch {
            self.error = error.localizedDescription
        }
        submitting = false
    }
}

#Preview {
    NavigationStack { BookingView(businessName: "Tom's Produce") }
}
