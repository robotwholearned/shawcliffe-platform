import SwiftUI

// Shared branded shell for the customer form screens — the SwiftUI mirror of the web
// design lock (BrandedShell.tsx + components/form/*): a brand-primary header band with a
// logo chip + name + tagline, a body of white card sections overlapping the band by -32,
// a full-width primary CTA, and a branded success card. Colors are per-client
// (client_branding); this file fixes the craft, never the hues.

// MARK: - Color roles (carried to cards/CTA via the environment, so callers don't thread them)

struct BrandTheme {
    var primary: Color
    var secondary: Color
    var accent: Color

    /// primary is the already-resolved header/CTA color; secondary falls back to primary,
    /// accent to the documented #f59e0b — matching brandingToVars() on web.
    init(branding: ClientBranding?, primary: Color) {
        self.primary = primary
        self.secondary = Color(hex: branding?.secondaryColor, default: primary)
        self.accent = Color(hex: branding?.accentColor, default: Color(hex: "#f59e0b", default: .orange))
    }
}

private struct BrandThemeKey: EnvironmentKey {
    static let defaultValue = BrandTheme(branding: nil, primary: Color(hex: nil))
}

extension EnvironmentValues {
    var brandTheme: BrandTheme {
        get { self[BrandThemeKey.self] }
        set { self[BrandThemeKey.self] = newValue }
    }
}

/// Resolves possibly-relative media paths (e.g. "/demo/x.png") against the platform base URL.
func brandMediaURL(_ path: String?) -> URL? {
    guard let path, !path.isEmpty else { return nil }
    if path.hasPrefix("http") { return URL(string: path) }
    return URL(string: path, relativeTo: Config.apiBaseURL)
}

// MARK: - Shell

struct BrandedScreen<Content: View>: View {
    let businessName: String
    let branding: ClientBranding?
    let primaryColor: Color
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                BrandedHeader(businessName: businessName, branding: branding, primaryColor: primaryColor)
                VStack(spacing: 16) {
                    content()
                }
                .frame(maxWidth: 512)
                .padding(.horizontal, 16)
                .padding(.bottom, 64)
                .offset(y: -32)
                .padding(.bottom, -32) // compensate the offset so scroll height stays correct
            }
            .frame(maxWidth: .infinity)
        }
        .background(Color(.systemGroupedBackground))
        .scrollDismissesKeyboard(.interactively)
        .environment(\.brandTheme, BrandTheme(branding: branding, primary: primaryColor))
    }
}

// MARK: - Header band (mirrors StorefrontView.headerBand + web readable-text rule)

private struct BrandedHeader: View {
    let businessName: String
    let branding: ClientBranding?
    let primaryColor: Color

    private var heroURL: URL? { brandMediaURL(branding?.heroPhotoUrls.first) }
    // With a hero photo the dark scrim keeps white text safe; without one, a light
    // primary_color needs dark text (web isLightColor / theme.isLightColor()).
    private var dark: Bool { heroURL == nil && Color.isLight(hex: branding?.primaryColor) }
    private var titleColor: Color { dark ? Color(.label) : .white }
    private var taglineColor: Color { dark ? Color(.label).opacity(0.7) : .white.opacity(0.75) }

    var body: some View {
        HStack(spacing: 16) {
            logoTile
            VStack(alignment: .leading, spacing: 2) {
                Text(businessName)
                    .font(.title2.bold())
                    .foregroundStyle(titleColor)
                if let tagline = branding?.tagline, !tagline.isEmpty {
                    Text(tagline)
                        .font(.subheadline)
                        .foregroundStyle(taglineColor)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: 512)
        .padding(.horizontal, 16)
        .padding(.top, 20) // ponytail: less than web's 40 — a native nav bar sits above this band
        .padding(.bottom, 56)
        .frame(maxWidth: .infinity)
        .background {
            ZStack {
                primaryColor
                if let heroURL {
                    AsyncImage(url: heroURL) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.clear
                    }
                    Color.black.opacity(0.5)
                }
            }
            .clipped()
        }
    }

    @ViewBuilder
    private var logoTile: some View {
        if let logoUrl = brandMediaURL(branding?.logoUrl) {
            AsyncImage(url: logoUrl) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Color.clear
            }
            .padding(4)
            .frame(width: 56, height: 56)
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
        } else {
            Text(String(businessName.prefix(1)).uppercased())
                .font(.title2.bold())
                .foregroundStyle(dark ? Color(.label) : .white)
                .frame(width: 56, height: 56)
                .background(
                    (dark ? Color.black.opacity(0.1) : Color.white.opacity(0.15)),
                    in: RoundedRectangle(cornerRadius: 12)
                )
        }
    }
}

// MARK: - Card section (white card + optional accent-ticked eyebrow + staggered entrance)

struct CardSection<Content: View>: View {
    var title: String? = nil
    var index: Int = 0
    @ViewBuilder let content: () -> Content

    @Environment(\.brandTheme) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                HStack(spacing: 8) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(theme.accent)
                        .frame(width: 2, height: 12)
                    Text(title.uppercased())
                        .font(.caption.weight(.semibold))
                        .kerning(0.8)
                        .foregroundStyle(theme.secondary)
                }
            }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(.separator).opacity(0.5), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
        .opacity(shown ? 1 : 0)
        .offset(y: shown ? 0 : 8)
        .onAppear {
            guard !shown else { return }
            if reduceMotion { shown = true; return }
            withAnimation(.easeOut(duration: 0.4).delay(Double(index) * 0.08)) { shown = true }
        }
    }
}

// MARK: - Field styling (native TextField, web-input look)

extension View {
    /// Rounded, hairline-bordered box so plain TextFields (outside a Form) read like the web inputs.
    func brandedField() -> some View {
        self
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Submit CTA (full-width primary fill, press scale, loading-label swap)

struct BrandedSubmitButton: View {
    let title: String
    var loadingLabel: String = "Sending…"
    let loading: Bool
    let disabled: Bool
    let action: () -> Void

    @Environment(\.brandTheme) private var theme

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Spacer()
                if loading {
                    ProgressView().tint(.white)
                    Text(loadingLabel)
                } else {
                    Text(title)
                }
                Spacer()
            }
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(theme.primary.opacity(disabled ? 0.5 : 1), in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(disabled)
    }
}

/// Press-scale feedback for branded buttons (the web `active:scale-95`).
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Branded success card (replaces the bare ✓)

struct BrandedSuccessView: View {
    let businessName: String
    let branding: ClientBranding?
    let title: String
    let message: String

    @Environment(\.brandTheme) private var theme
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        CardSection {
            VStack(spacing: 12) {
                logoChip
                Text(title)
                    .font(.title3.bold())
                    .multilineTextAlignment(.center)
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button {
                    dismiss()
                } label: {
                    Text("← Back to storefront")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(theme.primary)
                }
                .padding(.top, 4)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
    }

    @ViewBuilder
    private var logoChip: some View {
        if let logoUrl = brandMediaURL(branding?.logoUrl) {
            AsyncImage(url: logoUrl) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Color.clear
            }
            .padding(4)
            .frame(width: 64, height: 64)
            .background(.white, in: RoundedRectangle(cornerRadius: 12))
        } else {
            Text("✓")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 64, height: 64)
                .background(theme.primary, in: Circle())
        }
    }
}
