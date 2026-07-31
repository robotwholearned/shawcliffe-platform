import type { ClientBranding, FontTheme } from './supabase/types'

const FONT_STACK: Record<FontTheme, string> = {
  modern_sans:   "'Inter', 'DM Sans', system-ui, sans-serif",
  farmhouse:     "'Playfair Display', Georgia, serif",
  classic_serif: "'Merriweather', Georgia, serif",
  minimal:       "'DM Sans', system-ui, sans-serif",
  rustic:        "'Oswald', Impact, sans-serif",
}

// Google Fonts import URLs for each theme (loaded in [slug]/layout.tsx <head>)
export const FONT_IMPORT: Record<FontTheme, string> = {
  modern_sans:   'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  farmhouse:     'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  classic_serif: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
  minimal:       'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap',
  rustic:        'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&display=swap',
}

// Perceived luminance (0–1) of a #rrggbb color. Used to pick readable text on a
// brand-colored surface: a light primary_color needs dark text, not white.
export function isLightColor(hex: string | null | undefined): boolean {
  const h = hex?.replace('#', '')
  if (!h || h.length !== 6) return false
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

export function brandingToVars(branding: ClientBranding): Record<string, string> {
  return {
    '--brand-primary':   branding.primary_color,
    '--brand-secondary': branding.secondary_color ?? branding.primary_color,
    '--brand-accent':    branding.accent_color ?? '#f59e0b',
    '--brand-font':      FONT_STACK[branding.font_theme],
  }
}
