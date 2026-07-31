import SwiftUI

extension View {
    /// `.fontDesign(_:)` needs iOS 16.1+; this project's deployment target is 16.0.
    @ViewBuilder
    func brandedFontDesign(_ design: Font.Design) -> some View {
        if #available(iOS 16.1, *) {
            self.fontDesign(design)
        } else {
            self
        }
    }
}

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

    /// Perceived luminance test — a light primary_color needs dark header text, not white.
    /// Mirrors web `isLightColor` (theme.ts): (0.299R+0.587G+0.114B)/255 > 0.6.
    static func isLight(hex: String?) -> Bool {
        guard var hex, hex.hasPrefix("#"), hex.count == 7 else { return false }
        hex.removeFirst()
        guard let value = UInt64(hex, radix: 16) else { return false }
        let r = Double((value >> 16) & 0xFF)
        let g = Double((value >> 8) & 0xFF)
        let b = Double(value & 0xFF)
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
    }
}
