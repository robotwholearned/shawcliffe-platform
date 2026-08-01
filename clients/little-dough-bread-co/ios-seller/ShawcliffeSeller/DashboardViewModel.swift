import Foundation

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var todayStatus: DailyStatus?
    @Published var products: [Product] = []
    @Published var preorders: [PreorderDetail] = []
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var lastSaved: String?
    @Published var errorMessage: String?
    @Published var isSendingSMS = false
    @Published var smsResult: BroadcastResponse?
    @Published var isSendingEmail = false
    @Published var emailResult: BroadcastResponse?
    @Published var isSendingPush = false
    @Published var pushResult: BroadcastResponse?
    @Published var isSendingTest = false
    @Published var testResult: TestSendResult?

    private let clientId: String
    private let today: String = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter.string(from: Date())
    }()

    init(clientId: String) {
        self.clientId = clientId
    }

    func loadAll() async {
        isLoading = true
        async let statusTask: Void = loadStatus()
        async let productsTask: Void = loadProducts()
        async let preordersTask: Void = loadPreorders()
        _ = await (statusTask, productsTask, preordersTask)
        isLoading = false
    }

    func loadStatus() async {
        do {
            // Unique (client_id, date) constraint guarantees 0 or 1 rows.
            let rows: [DailyStatus] = try await supabase
                .from("daily_status")
                .select()
                .eq("client_id", value: clientId)
                .eq("date", value: today)
                .execute()
                .value
            todayStatus = rows.first
        } catch {
            errorMessage = "Couldn't load today's status."
        }
    }

    func loadProducts() async {
        do {
            let items: [Product] = try await supabase
                .from("products")
                .select()
                .eq("client_id", value: clientId)
                .order("sort_order")
                .execute()
                .value
            products = items
        } catch {
            errorMessage = "Couldn't load products."
        }
    }

    func loadPreorders() async {
        do {
            let rows: [Preorder] = try await supabase
                .from("preorders")
                .select()
                .eq("client_id", value: clientId)
                .order("created_at", ascending: false)
                .execute()
                .value

            guard !rows.isEmpty else {
                preorders = []
                return
            }

            let customerIds = Array(Set(rows.map(\.customerId)))
            let customers: [Customer] = try await supabase
                .from("customers")
                .select("id, name, phone, email")
                .eq("client_id", value: clientId)
                .in("id", values: customerIds)
                .execute()
                .value
            let customersById = Dictionary(uniqueKeysWithValues: customers.map { ($0.id, $0) })

            let preorderIds = rows.map(\.id)
            let items: [PreorderItem] = try await supabase
                .from("preorder_items")
                .select("preorder_id, product_id, quantity")
                .eq("client_id", value: clientId)
                .in("preorder_id", values: preorderIds)
                .execute()
                .value
            let productsById = Dictionary(uniqueKeysWithValues: products.map { ($0.id, $0) })

            preorders = rows.map { preorder in
                let lineItems = items
                    .filter { $0.preorderId == preorder.id }
                    .map { (productsById[$0.productId]?.name ?? "Unknown item", $0.quantity) }
                return PreorderDetail(
                    preorder: preorder,
                    customer: customersById[preorder.customerId],
                    items: lineItems
                )
            }
        } catch {
            errorMessage = "Couldn't load preorders."
        }
    }

    func setStatus(_ status: DailyStatusValue) async {
        isSaving = true
        let now = ISO8601DateFormatter().string(from: Date())
        do {
            if todayStatus != nil {
                try await supabase
                    .from("daily_status")
                    .update(DailyStatusUpdate(status: status.rawValue, updated_at: now))
                    .eq("client_id", value: clientId)
                    .eq("date", value: today)
                    .execute()
            } else {
                let inserted: DailyStatus = try await supabase
                    .from("daily_status")
                    .insert(DailyStatusInsert(client_id: clientId, date: today, status: status.rawValue))
                    .select()
                    .single()
                    .execute()
                    .value
                todayStatus = inserted
            }
            if var current = todayStatus {
                current.status = status
                current.updatedAt = now
                todayStatus = current
            }
            lastSaved = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short)
        } catch {
            errorMessage = "Couldn't update status."
        }
        isSaving = false
    }

    func setProductStatus(_ product: Product, status: ProductStatus) async {
        guard let index = products.firstIndex(where: { $0.id == product.id }) else { return }
        let previous = products[index].status
        products[index].status = status
        do {
            try await supabase
                .from("products")
                .update(ProductStatusUpdate(status: status.rawValue))
                .eq("client_id", value: clientId)
                .eq("id", value: product.id)
                .execute()
        } catch {
            products[index].status = previous
            errorMessage = "Couldn't update product status."
        }
    }

    func addProduct(name: String, price: Double?) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            let inserted: Product = try await supabase
                .from("products")
                .insert(ProductInsert(
                    client_id: clientId,
                    name: trimmed,
                    price: price,
                    status: ProductStatus.available.rawValue,
                    sort_order: products.count
                ))
                .select()
                .single()
                .execute()
                .value
            products.append(inserted)
        } catch {
            errorMessage = "Couldn't add product."
        }
    }

    func deleteProduct(_ product: Product) async {
        let previous = products
        products.removeAll { $0.id == product.id }
        do {
            try await supabase
                .from("products")
                .delete()
                .eq("client_id", value: clientId)
                .eq("id", value: product.id)
                .execute()
        } catch {
            products = previous
            errorMessage = "Couldn't delete product."
        }
    }

    func endOfDay() async {
        isSaving = true
        await setStatus(.closed)
        let previous = products
        products = products.map { var p = $0; p.status = .soldOut; return p }
        do {
            try await supabase
                .from("products")
                .update(ProductStatusUpdate(status: ProductStatus.soldOut.rawValue))
                .eq("client_id", value: clientId)
                .execute()
        } catch {
            products = previous
            errorMessage = "Couldn't complete end of day."
        }
        isSaving = false
    }

    func updatePreorderStatus(_ detail: PreorderDetail, status: String) async {
        guard let index = preorders.firstIndex(where: { $0.id == detail.id }) else { return }
        let previous = preorders[index].preorder.status
        preorders[index].preorder.status = status
        do {
            try await supabase
                .from("preorders")
                .update(PreorderStatusUpdate(status: status))
                .eq("client_id", value: clientId)
                .eq("id", value: detail.id)
                .execute()
        } catch {
            preorders[index].preorder.status = previous
            errorMessage = "Couldn't update preorder."
        }
    }

    func sendSMSBroadcast(message: String) async {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isSendingSMS = true
        smsResult = nil
        do {
            smsResult = try await BroadcastService.send(
                path: "api/broadcast/sms",
                body: SMSBroadcastRequest(message: trimmed)
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        isSendingSMS = false
    }

    func sendEmailBroadcast(subject: String, message: String) async {
        let trimmedSubject = subject.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedMessage = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSubject.isEmpty, !trimmedMessage.isEmpty else { return }
        isSendingEmail = true
        emailResult = nil
        do {
            emailResult = try await BroadcastService.send(
                path: "api/broadcast/email",
                body: EmailBroadcastRequest(subject: trimmedSubject, message: trimmedMessage)
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        isSendingEmail = false
    }

    func sendPushBroadcast(message: String) async {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isSendingPush = true
        pushResult = nil
        do {
            pushResult = try await BroadcastService.send(
                path: "api/broadcast/push",
                body: SMSBroadcastRequest(message: trimmed)
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        isSendingPush = false
    }

    func sendTest(channel: String, smsMessage: String, emailSubject: String, emailMessage: String, pushMessage: String) async {
        isSendingTest = true
        testResult = nil
        do {
            let response: BroadcastResponse
            switch channel {
            case "sms":
                let message = smsMessage.trimmingCharacters(in: .whitespacesAndNewlines)
                response = try await BroadcastService.send(
                    path: "api/broadcast/sms",
                    body: SMSBroadcastRequest(message: message.isEmpty ? "Test message from your dashboard." : message, test: true)
                )
            case "email":
                let subject = emailSubject.trimmingCharacters(in: .whitespacesAndNewlines)
                let message = emailMessage.trimmingCharacters(in: .whitespacesAndNewlines)
                response = try await BroadcastService.send(
                    path: "api/broadcast/email",
                    body: EmailBroadcastRequest(
                        subject: subject.isEmpty ? "Test notification" : subject,
                        message: message.isEmpty ? "Test message from your dashboard." : message,
                        test: true
                    )
                )
            default:
                let message = pushMessage.trimmingCharacters(in: .whitespacesAndNewlines)
                response = try await BroadcastService.send(
                    path: "api/broadcast/push",
                    body: SMSBroadcastRequest(message: message.isEmpty ? "Test push from your dashboard." : message, test: true)
                )
            }
            testResult = TestSendResult(
                channel: channel,
                ok: response.sent > 0,
                message: response.sent > 0 ? "Test sent — check your phone/inbox." : (response.errors?.first ?? "Test send failed")
            )
        } catch {
            testResult = TestSendResult(channel: channel, ok: false, message: error.localizedDescription)
        }
        isSendingTest = false
    }
}
