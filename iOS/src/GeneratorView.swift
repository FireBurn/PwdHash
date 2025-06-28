import SwiftUI

struct GeneratorView: View {
    @Binding var showSettings: Bool
    
    @State private var domain = ""
    @State private var generatedPassword = ""
    @State private var showAlert = false
    @State private var alertMessage = ""
    
    private var effectiveDomain: String {
        PasswordGenerator.getSite(from: domain) ?? "Invalid Input"
    }
    
    private var isDomainValid: Bool {
        PasswordGenerator.getSite(from: domain) != nil
    }

    var body: some View {
        Form {
            Section {
                Text("PwdHash Generator")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .listRowBackground(Color.clear)
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gear")
                    }
                }
            }
            
            Section(header: Text("Website Domain")) {
                TextField("Enter URL or Domain", text: $domain)
                    .keyboardType(.URL)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
                
                HStack {
                    Text("Hashing Domain")
                    Spacer()
                    Text(effectiveDomain)
                        .foregroundColor(isDomainValid ? .secondary : .red)
                }
            }
            
            Section {
                Button("Generate Password", action: generatePassword)
                    .disabled(!isDomainValid)
            }
            
            if !generatedPassword.isEmpty {
                Section(header: Text("Your Password")) {
                    HStack {
                        Text(generatedPassword)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        Spacer()
                        Button(action: copyToClipboard) {
                            Image(systemName: "doc.on.doc")
                        }
                        .buttonStyle(.borderless)
                    }
                }
            }
        }
        .alert(isPresented: $showAlert) {
            Alert(title: Text("PwdHash"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
        }
    }
    
    private func generatePassword() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        
        BiometricAuth.authenticate { result in
            switch result {
            case .success:
                guard let masterPassword = KeychainHelper.getMasterPassword() else {
                    self.alertMessage = "Could not retrieve master password."
                    self.showAlert = true
                    return
                }
                self.generatedPassword = PasswordGenerator.generateSecurePassword(
                    masterPassword: masterPassword,
                    domain: effectiveDomain
                )
            case .failure(let error):
                self.alertMessage = error.localizedDescription
                self.showAlert = true
            }
        }
    }
    
    private func copyToClipboard() {
        UIPasteboard.general.string = generatedPassword
        self.alertMessage = "Password copied to clipboard!"
        self.showAlert = true
    }
}
