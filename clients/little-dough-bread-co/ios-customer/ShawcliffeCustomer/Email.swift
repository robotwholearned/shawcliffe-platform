import Foundation

/// Mirrors platform/web/src/lib/email.ts so both surfaces validate identically.
enum Email {
    private static let regex = try! NSRegularExpression(pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

    static func error(for raw: String) -> String? {
        guard !raw.isEmpty else { return nil }
        let range = NSRange(raw.startIndex..., in: raw)
        return regex.firstMatch(in: raw, range: range) == nil ? "Enter a valid email address (e.g. jane@example.com)" : nil
    }
}
