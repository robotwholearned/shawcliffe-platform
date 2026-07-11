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

private let vehicleColors = ["Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown", "Gold", "Beige", "Other"]
private let otherOption = "Other"

private struct NHTSAMakesResponse: Decodable {
    struct Make: Decodable { let Make_Name: String }
    let Results: [Make]
}

private struct NHTSAModelsResponse: Decodable {
    struct Model: Decodable { let Model_Name: String }
    let Results: [Model]
}

private struct PlaceSuggestion: Decodable, Identifiable {
    let place_id: String
    let description: String
    var id: String { place_id }
}

private struct PlaceDetailsResponse: Decodable {
    let formatted_address: String
    let place_id: String
}

struct QuoteView: View {
    let businessName: String
    let showPhotoUpload: Bool
    let showVehicleFields: Bool
    let showPropertyFields: Bool

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
    @State private var vehicleMakes: [String] = []
    @State private var vehicleModels: [String] = []
    @State private var selectedMake = otherOption
    @State private var selectedModel = otherOption
    @State private var vehicleMakeOther = ""
    @State private var vehicleModelOther = ""
    @State private var selectedColor = otherOption
    @State private var vehicleColorOther = ""
    @State private var vehicleYear = ""
    @State private var vehicleVin = ""
    @State private var vehiclePlate = ""
    @State private var vehicleMileage = ""
    @State private var vehicleNotes = ""
    @State private var propertyAddress = ""
    @State private var addressSuggestions: [PlaceSuggestion] = []
    @State private var addressPlaceId: String?
    @State private var addressVerified = false
    @State private var addressSearchTask: Task<Void, Never>?
    @State private var suppressNextAddressSearch = false
    @State private var propertyGateCode = ""
    @State private var propertyParkingInstructions = ""
    @State private var propertyPetsOnSite = ""
    @State private var propertyAccessNotes = ""
    @State private var propertyPreferredServiceDay = ""
    @State private var propertyLawnSize = ""
    @State private var propertySnowRemovalAreas = ""
    @State private var propertyCleaningInstructions = ""
    @State private var propertySafetyNotes = ""
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
        .task {
            if showVehicleFields {
                await loadVehicleMakes()
            }
        }
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
                    Picker("Make", selection: $selectedMake) {
                        ForEach(vehicleMakes, id: \.self) { make in
                            Text(make).tag(make)
                        }
                        Text("Other").tag(otherOption)
                    }
                    .onChange(of: selectedMake) { newMake in
                        selectedModel = otherOption
                        vehicleModelOther = ""
                        vehicleModels = []
                        if newMake != otherOption {
                            Task { await loadVehicleModels(for: newMake) }
                        }
                    }
                    if selectedMake == otherOption {
                        TextField("Make", text: $vehicleMakeOther)
                    }

                    Picker("Model", selection: $selectedModel) {
                        ForEach(vehicleModels, id: \.self) { model in
                            Text(model).tag(model)
                        }
                        Text("Other").tag(otherOption)
                    }
                    if selectedModel == otherOption {
                        TextField("Model", text: $vehicleModelOther)
                    }

                    Picker("Color", selection: $selectedColor) {
                        ForEach(vehicleColors, id: \.self) { color in
                            Text(color).tag(color)
                        }
                    }
                    if selectedColor == otherOption {
                        TextField("Color", text: $vehicleColorOther)
                    }

                    TextField("Year", text: $vehicleYear)
                        .keyboardType(.numberPad)
                    TextField("License plate", text: $vehiclePlate)
                    TextField("VIN", text: $vehicleVin)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                    TextField("Mileage/hours", text: $vehicleMileage)
                        .keyboardType(.numberPad)
                    TextField("Issue notes", text: $vehicleNotes, axis: .vertical)
                        .lineLimit(2...4)
                }
            }

            if showPropertyFields {
                Section("Property (optional)") {
                    TextField("Address", text: $propertyAddress)
                        .onChange(of: propertyAddress) { newValue in
                            if suppressNextAddressSearch {
                                suppressNextAddressSearch = false
                                return
                            }
                            addressVerified = false
                            addressPlaceId = nil
                            addressSearchTask?.cancel()
                            let trimmed = newValue.trimmingCharacters(in: .whitespaces)
                            guard trimmed.count >= 3 else {
                                addressSuggestions = []
                                return
                            }
                            addressSearchTask = Task {
                                try? await Task.sleep(nanoseconds: 400_000_000)
                                guard !Task.isCancelled else { return }
                                await fetchAddressSuggestions(newValue)
                            }
                        }
                    ForEach(addressSuggestions) { suggestion in
                        Button {
                            Task { await selectAddressSuggestion(suggestion) }
                        } label: {
                            Text(suggestion.description)
                                .font(.footnote)
                                .foregroundStyle(.primary)
                        }
                    }
                    TextField("Gate code", text: $propertyGateCode)
                    TextField("Parking instructions", text: $propertyParkingInstructions)
                    TextField("Pets on site", text: $propertyPetsOnSite)
                    TextField("Access notes", text: $propertyAccessNotes, axis: .vertical)
                        .lineLimit(2...4)
                    TextField("Preferred service day", text: $propertyPreferredServiceDay)
                    TextField("Lawn size", text: $propertyLawnSize)
                    TextField("Snow removal areas", text: $propertySnowRemovalAreas)
                    TextField("Cleaning instructions", text: $propertyCleaningInstructions, axis: .vertical)
                        .lineLimit(2...4)
                    TextField("Safety notes", text: $propertySafetyNotes, axis: .vertical)
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

    private func loadVehicleMakes() async {
        guard let url = URL(string: "https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json") else { return }
        guard let response = try? await APIClient.get(url: url, as: NHTSAMakesResponse.self) else { return }
        vehicleMakes = response.Results.map(\.Make_Name).sorted()
    }

    private func loadVehicleModels(for make: String) async {
        guard let encodedMake = make.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/\(encodedMake)?format=json") else { return }
        guard let response = try? await APIClient.get(url: url, as: NHTSAModelsResponse.self) else { return }
        vehicleModels = response.Results.map(\.Model_Name).sorted()
    }

    private func fetchAddressSuggestions(_ query: String) async {
        var components = URLComponents(url: Config.apiBaseURL.appendingPathComponent("api/places/autocomplete"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "input", value: query),
            URLQueryItem(name: "client_id", value: Config.clientId),
        ]
        guard let url = components.url else { return }
        addressSuggestions = (try? await APIClient.get(url: url, as: [PlaceSuggestion].self)) ?? []
    }

    private func selectAddressSuggestion(_ suggestion: PlaceSuggestion) async {
        addressSuggestions = []
        var components = URLComponents(url: Config.apiBaseURL.appendingPathComponent("api/places/details"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "place_id", value: suggestion.place_id),
            URLQueryItem(name: "client_id", value: Config.clientId),
        ]
        suppressNextAddressSearch = true
        guard let url = components.url,
              let details = try? await APIClient.get(url: url, as: PlaceDetailsResponse.self) else {
            propertyAddress = suggestion.description
            addressPlaceId = nil
            addressVerified = false
            return
        }
        propertyAddress = details.formatted_address
        addressPlaceId = details.place_id
        addressVerified = true
    }

    private var effectiveVehicleMake: String? {
        let value = selectedMake == otherOption ? vehicleMakeOther : selectedMake
        return value.trimmingCharacters(in: .whitespaces).isEmpty ? nil : value
    }

    private var effectiveVehicleModel: String? {
        let value = selectedModel == otherOption ? vehicleModelOther : selectedModel
        return value.trimmingCharacters(in: .whitespaces).isEmpty ? nil : value
    }

    private var effectiveVehicleColor: String? {
        let value = selectedColor == otherOption ? vehicleColorOther : selectedColor
        return value.trimmingCharacters(in: .whitespaces).isEmpty ? nil : value
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
        if !vehicleYear.isEmpty {
            let currentYear = Calendar.current.component(.year, from: Date())
            guard let year = Int(vehicleYear), (1980...currentYear + 1).contains(year) else {
                error = "Enter a valid vehicle year between 1980 and \(Calendar.current.component(.year, from: Date()) + 1)."
                return
            }
        }
        if !vehicleVin.isEmpty {
            guard vehicleVin.count == 17, vehicleVin.allSatisfy({ $0.isLetter || $0.isNumber }) else {
                error = "VIN must be exactly 17 letters and numbers."
                return
            }
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
                    vehicle_make: effectiveVehicleMake,
                    vehicle_model: effectiveVehicleModel,
                    vehicle_year: Int(vehicleYear),
                    vehicle_vin: vehicleVin.isEmpty ? nil : vehicleVin,
                    vehicle_plate: vehiclePlate.isEmpty ? nil : vehiclePlate,
                    vehicle_mileage: Int(vehicleMileage),
                    vehicle_notes: vehicleNotes.isEmpty ? nil : vehicleNotes,
                    vehicle_color: effectiveVehicleColor,
                    property_address: propertyAddress.isEmpty ? nil : propertyAddress,
                    property_place_id: addressPlaceId,
                    property_address_verified: addressVerified,
                    property_gate_code: propertyGateCode.isEmpty ? nil : propertyGateCode,
                    property_parking_instructions: propertyParkingInstructions.isEmpty ? nil : propertyParkingInstructions,
                    property_pets_on_site: propertyPetsOnSite.isEmpty ? nil : propertyPetsOnSite,
                    property_access_notes: propertyAccessNotes.isEmpty ? nil : propertyAccessNotes,
                    property_preferred_service_day: propertyPreferredServiceDay.isEmpty ? nil : propertyPreferredServiceDay,
                    property_lawn_size: propertyLawnSize.isEmpty ? nil : propertyLawnSize,
                    property_snow_removal_areas: propertySnowRemovalAreas.isEmpty ? nil : propertySnowRemovalAreas,
                    property_cleaning_instructions: propertyCleaningInstructions.isEmpty ? nil : propertyCleaningInstructions,
                    property_safety_notes: propertySafetyNotes.isEmpty ? nil : propertySafetyNotes
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
    NavigationStack { QuoteView(businessName: "Tom's Produce", showPhotoUpload: true, showVehicleFields: true, showPropertyFields: true) }
}
