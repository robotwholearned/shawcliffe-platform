import SwiftUI
import PhotosUI
import UIKit

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

private struct QuotePhoto: Identifiable {
    let id = UUID()
    var thumbnail: Image?
    var url: String?
    var uploading = true
    var error: String?
}

struct QuoteView: View {
    let businessName: String
    let showPhotoUpload: Bool
    let showVehicleFields: Bool

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
    @State private var photoSelections: [PhotosPickerItem] = []
    @State private var photos: [QuotePhoto] = []
    @State private var vehicleMake = ""
    @State private var vehicleModel = ""
    @State private var vehicleYear = ""
    @State private var vehicleVin = ""
    @State private var vehiclePlate = ""
    @State private var vehicleMileage = ""
    @State private var vehicleNotes = ""
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

                if showPhotoUpload {
                    PhotosPicker(selection: $photoSelections, maxSelectionCount: 5, matching: .images) {
                        Text("Add Photos (\(photos.count)/5)")
                    }
                    .disabled(photos.count >= 5)
                    .onChange(of: photoSelections) { newSelections in
                        Task { await addPhotos(newSelections) }
                    }

                    if !photos.isEmpty {
                        ScrollView(.horizontal) {
                            HStack(spacing: 8) {
                                ForEach(photos) { photo in
                                    photoThumbnail(photo)
                                }
                            }
                        }
                    }
                }
            }

            if showVehicleFields {
                Section("Vehicle (optional)") {
                    TextField("Make", text: $vehicleMake)
                    TextField("Model", text: $vehicleModel)
                    TextField("Year", text: $vehicleYear)
                        .keyboardType(.numberPad)
                    TextField("License plate", text: $vehiclePlate)
                    TextField("VIN", text: $vehicleVin)
                    TextField("Mileage/hours", text: $vehicleMileage)
                        .keyboardType(.numberPad)
                    TextField("Issue notes", text: $vehicleNotes, axis: .vertical)
                        .lineLimit(2...4)
                }
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

    @ViewBuilder
    private func photoThumbnail(_ photo: QuotePhoto) -> some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let thumbnail = photo.thumbnail {
                    thumbnail.resizable().scaledToFill()
                } else {
                    Rectangle().fill(.gray.opacity(0.2))
                }
            }
            .frame(width: 60, height: 60)
            .clipped()
            .cornerRadius(6)

            if photo.uploading {
                ProgressView()
                    .frame(width: 60, height: 60)
                    .background(.black.opacity(0.2))
                    .cornerRadius(6)
            }

            Button {
                photos.removeAll { $0.id == photo.id }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.white, .black.opacity(0.6))
            }
            .offset(x: 6, y: -6)
        }
        .overlay(alignment: .bottom) {
            if photo.error != nil {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
                    .font(.caption2)
                    .padding(2)
                    .background(.white, in: Circle())
                    .offset(y: 6)
            }
        }
    }

    private func addPhotos(_ items: [PhotosPickerItem]) async {
        for item in items {
            let newPhoto = QuotePhoto()
            let photoId = newPhoto.id
            photos.append(newPhoto)

            // Re-resolve by id (not a captured index) after each await — the
            // user can remove an earlier photo mid-loop via its × button,
            // which would shift array positions out from under a stale index.
            guard let data = try? await item.loadTransferable(type: Data.self) else {
                if let i = photos.firstIndex(where: { $0.id == photoId }) {
                    photos[i].uploading = false
                    photos[i].error = "Couldn't load photo."
                }
                continue
            }
            if let uiImage = UIImage(data: data), let i = photos.firstIndex(where: { $0.id == photoId }) {
                photos[i].thumbnail = Image(uiImage: uiImage)
            }

            do {
                let url = try await APIClient.uploadPhoto(
                    path: "api/inquiry/photos",
                    clientId: Config.clientId,
                    fileData: data,
                    mimeType: item.supportedContentTypes.first?.preferredMIMEType ?? "image/jpeg"
                )
                if let i = photos.firstIndex(where: { $0.id == photoId }) {
                    photos[i].url = url
                    photos[i].uploading = false
                }
            } catch {
                if let i = photos.firstIndex(where: { $0.id == photoId }) {
                    photos[i].uploading = false
                    photos[i].error = error.localizedDescription
                }
            }
        }
        photoSelections = []
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
                    preferred_contact_method: preferredContact.rawValue,
                    photo_urls: photos.compactMap(\.url),
                    vehicle_make: vehicleMake.isEmpty ? nil : vehicleMake,
                    vehicle_model: vehicleModel.isEmpty ? nil : vehicleModel,
                    vehicle_year: Int(vehicleYear),
                    vehicle_vin: vehicleVin.isEmpty ? nil : vehicleVin,
                    vehicle_plate: vehiclePlate.isEmpty ? nil : vehiclePlate,
                    vehicle_mileage: Int(vehicleMileage),
                    vehicle_notes: vehicleNotes.isEmpty ? nil : vehicleNotes
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
    NavigationStack { QuoteView(businessName: "Tom's Produce", showPhotoUpload: true, showVehicleFields: true) }
}
