import SwiftUI

struct ShareView: View {
    var onComplete: () -> Void
    
    @State private var status: ShareStatus = .loading
    
    enum ShareStatus {
        case loading
        case authenticating(String) // domain
        case success
        case failure(String)
    }
    
    var body: some View {
        VStack(spacing: 20) {
            Image("icon_128") // Assumes an icon asset is added to the project
                .resizable()
                .frame(width: 64, height: 64)
                .cornerRadius(12)
            
            switch status {
            case .loading:
                Text("Loading...")
            case .authenticating(let domain):
                Text("Generating password for\n\(domain)")
                    .multilineTextAlignment(.center)
            case .success:
                Image(systemName: "checkmark.circle.fill")
                    .font(.largeTitle)
                    .foregroundColor(.green)
                Text("Password Copied!")
            case .failure(let message):
                Image(systemName: "xmark.circle.fill")
                    .font(.largeTitle)
                    .foregroundColor(.red)
                Text(message)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.thinMaterial)
        .onAppear(perform: handleShare)
    }
    
    private func handleShare() {
        // Find the URL from the extension context
        guard let extensionItem = (self.extensionContext?.inputItems.first as? NSExtensionItem),
              let itemProvider = extensionItem.attachments?.first,
              itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) else {
            self.status = .failure("Could not find a valid URL.")
            return
        }
        
        itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { (item, error) in
            DispatchQueue.main.async {
                guard let url = item as? URL, let domain = PasswordGenerator.getSite(from: url.absoluteString) else {
                    self.status = .failure("Could not extract a valid domain from the URL.")
                    return
                }
                self.process(domain: domain)
            }
        }
    }
    
    private func process(domain: String) {
        self.status = .authenticating(domain)
        
        guard KeychainHelper.hasMasterPassword(), let masterPassword = KeychainHelper.getMasterPassword() else {
            self.status = .failure(BiometricError.noMasterPassword.localizedDescription)
            return
        }

        BiometricAuth.authenticate { result in
            switch result {
            case .success:
                let generatedPassword = PasswordGenerator.generateSecurePassword(masterPassword: masterPassword, domain: domain)
                UIPasteboard.general.string = generatedPassword
                self.status = .success
                
                // Automatically close the share sheet after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    onComplete()
                }
                
            case .failure(let error):
                self.status = .failure(error.localizedDescription)
            }
        }
    }
    
    // Helper to get the extension context from the environment
    private var extensionContext: NSExtensionContext? {
        let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        return scene?.windows.first?.rootViewController?.extensionContext
    }
}
