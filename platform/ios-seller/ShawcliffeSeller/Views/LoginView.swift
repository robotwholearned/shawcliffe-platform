import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 4) {
                Text("Shawcliffe Seller")
                    .font(.title.bold())
                Text("Manage your storefront on the go")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 12) {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding()
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 12))

                SecureField("Password", text: $password)
                    .textContentType(.password)
                    .padding()
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 12))

                if let error = auth.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await auth.signIn(email: email, password: password) }
                } label: {
                    if auth.isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Sign In").bold()
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(.white)
                .disabled(auth.isLoading || email.isEmpty || password.isEmpty)
            }
            .padding(.horizontal, 24)

            Spacer()
            Spacer()
        }
        .overlay {
            if auth.isRestoringSession {
                ProgressView()
            }
        }
    }
}

#Preview {
    LoginView().environmentObject(AuthViewModel())
}
