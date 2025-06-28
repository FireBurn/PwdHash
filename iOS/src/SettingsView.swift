import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var hasMasterPassword: Bool

    @State private var showConfirmDeleteAlert = false

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Master Password")) {
                    Text("The master password is encrypted and stored securely on this device. Deleting it will require you to set up a new one.")
                }
                
                Section {
                    Button("Delete Master Password", role: .destructive) {
                        showConfirmDeleteAlert = true
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert("Delete Master Password?", isPresented: $showConfirmDeleteAlert) {
                Button("Delete", role: .destructive, action: deletePassword)
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This action cannot be undone. You will need to set up a new master password.")
            }
        }
    }
    
    private func deletePassword() {
        KeychainHelper.deleteMasterPassword()
        hasMasterPassword = false
        dismiss()
    }
}
