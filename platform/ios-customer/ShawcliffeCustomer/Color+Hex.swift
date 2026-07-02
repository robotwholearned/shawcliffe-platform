import SwiftUI

extension Color {
    /// Parses "#RRGGBB" (as stored in client_branding.primary_color etc.), falling back to the given default.
    init(hex: String?, default fallback: Color = .blue) {
        guard var hex = hex, hex.hasPrefix("#"), hex.count == 7 else {
            self = fallback
            return
        }
        hex.removeFirst()
        guard let value = UInt64(hex, radix: 16) else {
            self = fallback
            return
        }
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
