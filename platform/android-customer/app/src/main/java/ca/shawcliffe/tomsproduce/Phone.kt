package ca.shawcliffe.tomsproduce

/** Mirrors platform/web/src/lib/phone.ts so all surfaces normalize/validate identically. */
object Phone {
    fun normalize(raw: String): String? {
        val digitsAndPlus = raw.filter { it.isDigit() || it == '+' }
        val digitsOnly = raw.filter { it.isDigit() }

        if (digitsAndPlus.startsWith("+") && digitsOnly.length in 10..15) {
            return "+$digitsOnly"
        }
        if (digitsOnly.length == 10) {
            return "+1$digitsOnly"
        }
        if (digitsOnly.length == 11 && digitsOnly.startsWith("1")) {
            return "+$digitsOnly"
        }
        return null
    }

    fun error(raw: String): String? {
        if (raw.isEmpty()) return null
        return if (normalize(raw) == null) "Enter a valid phone number (e.g. (289) 555-0100)" else null
    }
}
