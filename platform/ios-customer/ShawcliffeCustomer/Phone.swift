import Foundation

/// Mirrors platform/web/src/lib/phone.ts so both surfaces normalize/validate identically.
enum Phone {
    static func normalize(_ raw: String) -> String? {
        let digitsAndPlus = raw.filter { $0.isNumber || $0 == "+" }
        let digitsOnly = raw.filter(\.isNumber)

        if digitsAndPlus.hasPrefix("+"), (10...15).contains(digitsOnly.count) {
            return "+\(digitsOnly)"
        }
        if digitsOnly.count == 10 {
            return "+1\(digitsOnly)"
        }
        if digitsOnly.count == 11, digitsOnly.hasPrefix("1") {
            return "+\(digitsOnly)"
        }
        return nil
    }

    static func error(for raw: String) -> String? {
        guard !raw.isEmpty else { return nil }
        return normalize(raw) == nil ? "Enter a valid phone number (e.g. (289) 555-0100)" : nil
    }
}
