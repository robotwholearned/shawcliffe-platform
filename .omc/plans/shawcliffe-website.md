# Shawcliffe Digital — One-Page Website Plan

**Status:** pending approval  
**Date:** 2026-05-27

---

## Requirements Summary

Build a polished, brand-accurate single-page website for Shawcliffe Digital, replacing the existing test `index.html`. The site must match the visual identity from the business card (navy + blue palette, "S" logo concept) and use real contact/brand information.

**Source of truth (business card):**
- Company: Shawcliffe Digital
- Tagline: "Custom Branded Apps for Local Contractors & Owner Operators"
- CTO: Cassandra Orr
- Phone: (289) 314-0591
- Email: cassandra@shawcliffedigital.com
- Website: shawcliffedigital.com
- Service area: Serving Local Businesses

---

## Acceptance Criteria

- [ ] Single HTML file, no build step, no external dependencies (except Google Fonts CDN)
- [ ] Brand colors match business card: dark navy `#0d1b2e` + electric blue `#2563eb`
- [ ] SVG logo included inline — stylized "S" shape matching card geometry (two hexagonal halves)
- [ ] All contact details are exactly as on the business card (phone, email, tagline)
- [ ] Fully responsive: passes visual inspection at 375px, 768px, and 1280px widths
- [ ] Contact form collects: Name, Business Type, Phone, Message — submits without JS error
- [ ] Zero placeholder or lorem ipsum text
- [ ] Page loads in < 1s with no console errors
- [ ] File saved as `index.html` (replaces existing test file); old test files renamed `_index-trades.html` and `_index-general.html`

---

## Implementation Steps

### 1. File management
- Rename `index.html` → `_index-trades.html`
- Rename `index2.html` → `_index-general.html`
- Create new `index.html`

### 2. Brand / Design system (inline `<style>`)
```
--navy-900: #0a1628
--navy-800: #0d1b2e
--navy-700: #1a2d4a
--blue-600: #2563eb
--blue-500: #3b82f6
--blue-400: #60a5fa
--white: #f8fafc
--gray: #94a3b8
```
Typography: `Inter` (Google Fonts), fallback system-ui  
Accent on CTAs: `--blue-600` with hover `--blue-500`

### 3. Page sections (top → bottom)

| # | Section | Key content |
|---|---------|-------------|
| 1 | **Nav** | Inline SVG logo + "Shawcliffe Digital" wordmark + phone CTA button |
| 2 | **Hero** | H1: "Custom Branded Apps for Local Contractors & Owner Operators" — sub: "We build the tech so you can focus on the work." — CTA: "Get a Free Consultation" |
| 3 | **Value props** | 3-column grid: "Built for Trades" / "Your Brand, Your App" / "Simple & Transparent" — icon + 2-line description each |
| 4 | **How it works** | 3-step horizontal flow: Discovery Call → Design & Build → Hand-Off & Support |
| 5 | **Contact** | Form (Name, Business Type, Phone, Message) + contact details block (phone, email, service area) |
| 6 | **Footer** | Copyright 2025 Shawcliffe Digital · cassandra@shawcliffedigital.com |

### 4. SVG Logo
Construct inline SVG approximating the business card "S" — two stacked hexagonal chevrons (top blue `#2563eb`, bottom navy `#0d1b2e`) forming an "S" silhouette. Size: 40×40px in nav, 80×80px in hero.

### 5. Responsive breakpoints
- `< 640px`: single column, stacked nav
- `640–1024px`: 2-col grid where applicable
- `> 1024px`: full 3-col layout

### 6. Contact form behavior
Vanilla JS: `preventDefault` + show inline success message. No external form service required (can be wired up later).

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| SVG logo doesn't closely match card | Use geometric construction (hexagon path math); note it's an approximation — original vector file would be needed for pixel-perfect match |
| Existing test files had Calgary-specific content that leaks into new file | New file written from scratch; old files only renamed, not deleted |
| Google Fonts CDN fails for offline use | System-ui fallback declared; page remains functional |

---

## Verification Steps

1. Open `index.html` in browser — confirm no console errors
2. Resize to 375px width — confirm no horizontal scroll, all content readable
3. Check all contact links: `tel:`, `mailto:` hrefs match business card exactly
4. Submit contact form — confirm success message appears, no JS error
5. Search page source for "placeholder", "lorem", "555", "Calgary" — expect zero hits
6. Confirm `_index-trades.html` and `_index-general.html` exist and contain original content

---

## Out of Scope

- Backend form submission / email delivery
- CMS or content management
- Analytics integration
- Multi-page navigation
