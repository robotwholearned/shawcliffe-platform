package ca.shawcliffe.tomsproduce

/** Mirrors platform/web/src/lib/email.ts so all surfaces validate identically. */
object Email {
    private val regex = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

    fun error(raw: String): String? {
        if (raw.isEmpty()) return null
        return if (!regex.matches(raw)) "Enter a valid email address (e.g. jane@example.com)" else null
    }
}
