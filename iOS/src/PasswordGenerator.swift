import Foundation
import CryptoKit

// This is a direct, byte-for-byte compatible port of the PasswordGenerator
// from the other platforms to ensure identical password output.
enum PasswordGenerator {
    
    /// Extracts a registrable domain from a given string.
    static func getSite(from urlString: String) -> String? {
        let host: String?
        if let url = URL(string: urlString), let urlHost = url.host {
            host = urlHost
        } else if let url = URL(string: "https://\(urlString)"), let urlHost = url.host, urlHost.contains(".") {
            host = urlHost
        } else {
            return nil
        }
        
        guard let validHost = host else { return nil }

        let parts = validHost.split(separator: ".").reversed().map(String.init)
        if parts.count <= 1 {
            return validHost
        }

        let domain = "\(parts[1]).\(parts[0])"
        let commonSecondLevels: Set<String> = ["co", "com", "org", "net", "gov", "edu"]

        if parts.count > 2 && commonSecondLevels.contains(parts[1]) {
            return "\(parts[2]).\(domain)"
        } else {
            return domain
        }
    }

    /// Generates a secure, deterministic, site-specific password using PBKDF2.
    static func generateSecurePassword(masterPassword: String, domain: String) -> String {
        let length = 16
        let iterations = 300000
        let keyLength = 32 // 256 bits

        let lowercaseChars = "abcdefghijklmnopqrstuvwxyz"
        let uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        let digitChars = "0123456789"
        let symbolChars = "!@#$%^&*()_-+="
        let allChars = lowercaseChars + uppercaseChars + digitChars + symbolChars

        guard let passwordData = masterPassword.data(using: .utf8),
              let saltData = domain.data(using: .utf8) else {
            return "" // Should not happen
        }

        let key = try! PKCS5.PBKDF2<HMAC<SHA256>>.deriveKey(
            password: passwordData,
            salt: saltData,
            iterations: iterations,
            outputByteCount: keyLength
        )

        let keyBytes = key.withUnsafeBytes { Array($0) }
        
        // 1. Build password, enforcing constraints
        var passwordChars: [Character] = []
        passwordChars.append(lowercaseChars[lowercaseChars.index(lowercaseChars.startIndex, offsetBy: Int(keyBytes[0]) % lowercaseChars.count)])
        passwordChars.append(uppercaseChars[uppercaseChars.index(uppercaseChars.startIndex, offsetBy: Int(keyBytes[1]) % uppercaseChars.count)])
        passwordChars.append(digitChars[digitChars.index(digitChars.startIndex, offsetBy: Int(keyBytes[2]) % digitChars.count)])
        passwordChars.append(symbolChars[symbolChars.index(symbolChars.startIndex, offsetBy: Int(keyBytes[3]) % symbolChars.count)])

        for i in 4..<length {
            let byteIndex = i % keyBytes.count
            passwordChars.append(allChars[allChars.index(allChars.startIndex, offsetBy: Int(keyBytes[byteIndex]) % allChars.count)])
        }
        
        // 2. Use a manual, portable Fisher-Yates shuffle to match other platforms.
        for i in (0..<passwordChars.count).reversed() {
            let byteIndex = (length + i) % keyBytes.count
            let j = Int(keyBytes[byteIndex]) % (i + 1)
            passwordChars.swapAt(i, j)
        }

        return String(passwordChars)
    }
}
