package ca.shawcliffe.tomsproduce

import androidx.compose.ui.graphics.Color

/** Parses "#RRGGBB" (as stored in client_branding.primary_color etc.), falling back to the given default. Mirrors ios-customer/Color+Hex.swift. */
fun colorFromHex(hex: String?, default: Color = Color(0xFF114AC4)): Color {
    if (hex == null || !hex.startsWith("#") || hex.length != 7) return default
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: IllegalArgumentException) {
        default
    }
}
