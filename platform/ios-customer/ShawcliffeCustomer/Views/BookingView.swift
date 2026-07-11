import SwiftUI
import PhotosUI
import UIKit

private enum TimePreference: String, CaseIterable, Identifiable {
    case morning, afternoon, evening, flexible
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

struct BookingView: View {
    let businessName: String
    let showPetFields: Bool

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
    @State private var petName = ""
    @State private var petBreed = ""
    @State private var petSize = ""
    @State private var petAge = ""
    @State private var petAllergies = ""
    @State private var petBehaviorNotes = ""
    @State private var petGroomingPreferences = ""
    @State private var petVaccinationInfo = ""
    @State private var petEmergencyContact = ""
    @State private var petCareInstructions = ""
    @State private var petPhotoSelection: PhotosPickerItem?
    @State private var petPhotoThumbnail: Image?
    @State private var petPhotoURL: String?
    @State private var petPhotoUploading = false
    @State private var petPhotoError: String?
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

            if showPetFields {
                Section("Pet (optional)") {
                    TextField("Pet name", text: $petName)
                    TextField("Breed", text: $petBreed)
                    TextField("Size", text: $petSize)
                    TextField("Age", text: $petAge)
                    TextField("Allergies", text: $petAllergies)
                    TextField("Behaviour notes", text: $petBehaviorNotes, axis: .vertical)
                        .lineLimit(2...4)
                    TextField("Grooming preferences", text: $petGroomingPreferences)
                    TextField("Vaccination info", text: $petVaccinationInfo)
                    TextField("Emergency contact", text: $petEmergencyContact)
                    TextField("Care instructions", text: $petCareInstructions, axis: .vertical)
                        .lineLimit(2...4)

                    PhotosPicker(selection: $petPhotoSelection, matching: .images) {
                        Text(petPhotoURL == nil ? "Add Pet Photo (optional)" : "Change Pet Photo")
                    }
                    .onChange(of: petPhotoSelection) { newItem in
                        Task { await uploadPetPhoto(newItem) }
                    }

                    if petPhotoUploading || petPhotoThumbnail != nil {
                        petPhotoThumbnailView
                    }
                    if let petPhotoError {
                        Text(petPhotoError).foregroundStyle(.red).font(.caption)
                    }
                }
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

    @ViewBuilder
    private var petPhotoThumbnailView: some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let petPhotoThumbnail {
                    petPhotoThumbnail.resizable().scaledToFill()
                } else {
                    Rectangle().fill(.gray.opacity(0.2))
                }
            }
            .frame(width: 60, height: 60)
            .clipped()
            .cornerRadius(6)

            if petPhotoUploading {
                ProgressView()
                    .frame(width: 60, height: 60)
                    .background(.black.opacity(0.2))
                    .cornerRadius(6)
            }

            Button {
                petPhotoSelection = nil
                petPhotoThumbnail = nil
                petPhotoURL = nil
                petPhotoError = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.white, .black.opacity(0.6))
            }
            .offset(x: 6, y: -6)
        }
    }

    private func uploadPetPhoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        petPhotoError = nil
        petPhotoThumbnail = nil
        petPhotoURL = nil
        petPhotoUploading = true

        guard let data = try? await item.loadTransferable(type: Data.self) else {
            petPhotoUploading = false
            petPhotoError = "Couldn't load photo."
            return
        }
        if let uiImage = UIImage(data: data) {
            petPhotoThumbnail = Image(uiImage: uiImage)
        }

        do {
            let response = try await APIClient.submitMultipart(
                path: "api/inquiry/photos",
                fields: ["client_id": Config.clientId, "context": "booking"],
                fileFieldName: "file",
                filename: "photo.jpg",
                fileData: data,
                mimeType: item.supportedContentTypes.first?.preferredMIMEType ?? "image/jpeg",
                as: PhotoUploadResponse.self
            )
            petPhotoURL = response.url
        } catch {
            petPhotoError = error.localizedDescription
        }
        petPhotoUploading = false
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
        if let emailErr = Email.error(for: email) {
            error = emailErr
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
                    notes: notes.isEmpty ? nil : notes,
                    pet_name: petName.isEmpty ? nil : petName,
                    pet_breed: petBreed.isEmpty ? nil : petBreed,
                    pet_size: petSize.isEmpty ? nil : petSize,
                    pet_age: petAge.isEmpty ? nil : petAge,
                    pet_allergies: petAllergies.isEmpty ? nil : petAllergies,
                    pet_behavior_notes: petBehaviorNotes.isEmpty ? nil : petBehaviorNotes,
                    pet_grooming_preferences: petGroomingPreferences.isEmpty ? nil : petGroomingPreferences,
                    pet_vaccination_info: petVaccinationInfo.isEmpty ? nil : petVaccinationInfo,
                    pet_emergency_contact: petEmergencyContact.isEmpty ? nil : petEmergencyContact,
                    pet_care_instructions: petCareInstructions.isEmpty ? nil : petCareInstructions,
                    pet_photo_url: petPhotoURL
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
    NavigationStack { BookingView(businessName: "Tom's Produce", showPetFields: true) }
}
