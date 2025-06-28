import SwiftUI

struct ContentView: View {
    // This state determines which of the main screens is visible.
    @State private var hasMasterPassword = KeychainHelper.hasMasterPassword()
    @State private var showSettings = false

    var body: some View {
        // A simple navigation stack to handle the settings screen.
        NavigationStack {
            VStack {
                if hasMasterPassword {
                    GeneratorView(showSettings: $showSettings)
                } else {
                    SetupView(hasMasterPassword: $hasMasterPassword)
                }
            }
            .sheet(isPresented: $showSettings) {
                // Present settings as a modal sheet.
                SettingsView(hasMasterPassword: $hasMasterPassword)
            }
        }
    }
}
