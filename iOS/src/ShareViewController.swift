import UIKit
import SwiftUI
import UniformTypeIdentifiers

// This UIViewController hosts the SwiftUI view for the share extension.
class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        self.view.backgroundColor = .clear

        // Create the SwiftUI view and pass a closure to close the extension
        let shareView = ShareView {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
        
        // Host the SwiftUI view
        let hostingController = UIHostingController(rootView: shareView)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        self.view.addSubview(hostingController.view)
        
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        
        self.addChild(hostingController)
        hostingController.didMove(toParent: self)
    }
}
