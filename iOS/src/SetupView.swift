import SwiftUI

struct SetupView: View {
    @Binding var hasMasterPassword: Bool

    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showAlert = false
    @State private var alertMessage = ""

    var body: some View {
        Form {
            Section {
                Text("Setup Master Password")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .listRowBackground(Color.clear)
                Text("This password will be stored securely in the iOS Keychain and is required to generate passwords.")
                    .listRowBackground(Color.clear)
            }
            
            Section(header: Text("Master Password")) {
                SecureField("Enter Master Password", text: $password)
                SecureField("Confirm Master Password", text: $confirmPassword)
            }

            Section {
                Button("Save Master Password", action: savePassword)
                    .disabled(password.isEmpty || confirmPassword.isEmpty)
            }
        }
        .alert(isPresented: $showAlert) {
            Alert(title: Text("PwdHash"), message: Text(alertMessage), dismissButton: .default(Text("OK")))
        }
    }
    
    private func savePassword() {
        guard !password.isEmpty else {
            alertMessage = "Password cannot be empty."
            showAlert = true
            return
        }
        
        guard password == confirmPassword else {
            alertMessage = "Passwords do not match."
            showAlert = true
            return
        }
        
        do {
            try KeychainHelper.saveMasterPassword(password)
            alertMessage = "Master password saved!"
            showAlert = true
            // Setting this will cause ContentView to switch to the GeneratorView
            hasMasterPassword = true
        } catch {
            alertMessage = "Failed to save password to Keychain: \(error.localizedDescription)"
            showAlert = true
        }
    }
}
