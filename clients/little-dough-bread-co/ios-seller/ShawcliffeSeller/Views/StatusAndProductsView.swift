import SwiftUI

struct StatusAndProductsView: View {
    @ObservedObject var viewModel: DashboardViewModel
    @State private var showAddProduct = false
    @State private var newProductName = ""
    @State private var newProductPrice = ""

    var body: some View {
        List {
            Section {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(DailyStatusValue.allCases) { option in
                        Button {
                            Task { await viewModel.setStatus(option) }
                        } label: {
                            Label(option.label, systemImage: option.systemImage)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(viewModel.todayStatus?.status == option ? .accentColor : Color(.systemGray5))
                        .foregroundStyle(viewModel.todayStatus?.status == option ? .white : .primary)
                        .disabled(viewModel.isSaving)
                    }
                }
                .padding(.vertical, 4)
            } header: {
                HStack {
                    Text("Today's Status")
                    Spacer()
                    if let lastSaved = viewModel.lastSaved {
                        Text("Saved \(lastSaved)").font(.caption)
                    }
                }
            }

            Section {
                ForEach(viewModel.products) { product in
                    ProductRow(product: product, viewModel: viewModel)
                }

                if showAddProduct {
                    HStack {
                        TextField("Product name", text: $newProductName)
                        TextField("Price", text: $newProductPrice)
                            .keyboardType(.decimalPad)
                            .frame(width: 70)
                        Button("Add") {
                            Task {
                                await viewModel.addProduct(
                                    name: newProductName,
                                    price: Double(newProductPrice)
                                )
                                newProductName = ""
                                newProductPrice = ""
                                showAddProduct = false
                            }
                        }
                        .disabled(newProductName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            } header: {
                HStack {
                    Text("Products")
                    Spacer()
                    Button(showAddProduct ? "Cancel" : "+ Add") {
                        showAddProduct.toggle()
                    }
                }
            }

            Section {
                Button(role: .destructive) {
                    Task { await viewModel.endOfDay() }
                } label: {
                    HStack {
                        Spacer()
                        Text("End of Day — Mark All Sold Out")
                        Spacer()
                    }
                }
                .disabled(viewModel.isSaving)
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if viewModel.isLoading {
                ProgressView()
            }
        }
    }
}

private struct ProductRow: View {
    let product: Product
    @ObservedObject var viewModel: DashboardViewModel

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(product.name).font(.body)
                if let price = product.price {
                    Text(price, format: .currency(code: "CAD"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            ForEach(ProductStatus.allCases, id: \.self) { status in
                Button {
                    Task { await viewModel.setProductStatus(product, status: status) }
                } label: {
                    Image(systemName: status.systemImage)
                }
                .buttonStyle(.bordered)
                .tint(product.status == status ? color(for: status) : Color(.systemGray5))
                .foregroundStyle(product.status == status ? .white : .primary)
                .font(.caption)
            }
        }
        .swipeActions {
            Button("Delete", role: .destructive) {
                Task { await viewModel.deleteProduct(product) }
            }
        }
    }

    private func color(for status: ProductStatus) -> Color {
        switch status {
        case .available: return .green
        case .low: return .yellow
        case .soldOut: return .red
        }
    }
}
