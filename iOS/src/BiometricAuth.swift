import Foundation
import LocalAuthentication

enum BiometricError: LocalizedError {
    case authenticationFailed(String)
    case noMasterPassword
    
    var errorDescription: String? {
        switch self {
        case .authenticationFailed(let message):
            return message
        case .noMasterPassword:
            return "No master password is set. Please open the app to set one up."
        }
    }
}

enum BiometricAuth {
    static func authenticate(completion: @escaping (Result<Void, BiometricError>) -> Void) {
        let context = LAContext()
        var error: NSError?

        let reason = "Authenticate to generate your password."

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authenticationError in
                DispatchQueue.main.async {
                    if success {
                        completion(.success(()))
                    } else {
                        let errorMessage = authenticationError?.localizedDescription ?? "Authentication failed."
                        completion(.failure(.authenticationFailed(errorMessage)))
                    }
                }
            }
        } else {
            // Fallback for devices without biometrics (e.g., older iPads, simulators)
            // Or if biometrics are not enrolled.
            let errorMessage = error?.localizedDescription ?? "Biometrics not available."
            completion(.failure(.authenticationFailed(errorMessage)))
        }
    }
}
