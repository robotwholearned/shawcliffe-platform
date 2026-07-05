// Subdomains that map to the app itself, not a client slug — must stay in
// sync with any host-based routing (see middleware.ts) so a client can never
// be provisioned with one of these as its slug.
export const RESERVED_SLUGS = new Set(['www', 'admin', 'seller', 'platform'])
