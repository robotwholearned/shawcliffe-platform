// Single source of truth for the 12 demo/showcase clients — one per `vertical`
// archetype. Consumed by seed-demos.mjs (live applier + --emit-sql SQL mirror).
//
// Everything here is SYNTHETIC demo data. Clients are marked only by their
// `demo-*` slug (no is_demo column — see .omc/plans/demo-clients-seed.md).
//
// Fixed, deterministic UUIDs make the seed idempotent (re-runs upsert, never
// duplicate). `demo0001-…` from the plan sketch isn't valid hex, so ids use:
//   d0d0<TT><CC>-<RRRR>-0000-0000-000000000000
//   TT = table code (hex), CC = client index (01–0c), RRRR = row index.
// Recognisable `d0d0` prefix; every char is valid hex so Postgres accepts it.
//
// Images are brand-coloured SVG placeholders generated + uploaded to the public
// Storage bucket `demo-assets` by the seeder (zero network dependency, always
// deterministic). Swap in real photos by overwriting the same storage paths.

// ─── UUID + image helpers (deterministic) ────────────────────────────────────

const TABLE_CODE = {
  clients: 0x00, locations: 0x02, products: 0x03, daily_status: 0x04,
  customers: 0x05, preorders: 0x06, bookings: 0x07, inquiries: 0x08,
  vehicles: 0x09, pets: 0x0a, properties: 0x0b, document_checklist_items: 0x0c,
}
const hx2 = (n) => n.toString(16).padStart(2, '0')
const hx4 = (n) => n.toString(16).padStart(4, '0')

// clientIdx is 1-based (1..12); rowIdx 0-based.
export function uid(table, clientIdx, rowIdx = 0) {
  const tt = hx2(TABLE_CODE[table])
  const cc = hx2(clientIdx)
  return `d0d0${tt}${cc}-${hx4(rowIdx)}-0000-0000-000000000000`
}

export function clientId(clientIdx) {
  return `d0d00000-0000-0000-0000-0000000000${hx2(clientIdx)}`
}

// Public Storage URL for a generated image. `base` is NEXT_PUBLIC_SUPABASE_URL.
export function imageUrl(base, slug, kind, n = 0) {
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/demo-assets/${slug}/${kind}-${n}.svg`
}

export const BUCKET = 'demo-assets'

// Synthetic consent values (documented: not real user consent).
export const CONSENT_VERSION = 'demo-consent-v1'
export const CONSENT_IP_HASH = '0'.repeat(64)

// Copied VERBATIM from platform/web/src/lib/components.ts (DEFAULT_COMPONENTS,
// ~L78-127). Raw inserts bypass the admin API's auto-fill, so each client's
// enabled_components MUST be set explicitly or its storefront surfaces won't
// render. Keep in sync by hand if components.ts changes.
export const DEFAULT_COMPONENTS = {
  personal_care_appointment: ['business_profile', 'service_product_menu', 'booking_request_system', 'notifications', 'review_request_system'],
  home_service_trades: ['business_profile', 'service_product_menu', 'inquiry_quote_form', 'photo_file_upload', 'notifications', 'review_request_system'],
  home_property_maintenance: ['business_profile', 'service_product_menu', 'inquiry_quote_form', 'recurring_schedule', 'property_profiles', 'notifications', 'review_request_system'],
  food_producers_specialty_makers: ['business_profile', 'service_product_menu', 'product_inventory', 'notifications', 'review_request_system'],
  mobile_popup_sellers: ['business_profile', 'service_product_menu', 'admin_dashboard', 'status_tracker', 'product_inventory', 'location_pop_up_tracker', 'qr_code_setup', 'notifications'],
  pet_animal_services: ['business_profile', 'service_product_menu', 'booking_request_system', 'pet_profiles', 'notifications', 'review_request_system'],
  vehicle_equipment_services: ['business_profile', 'service_product_menu', 'inquiry_quote_form', 'vehicle_profiles', 'photo_file_upload', 'notifications', 'review_request_system'],
  creative_event_services: ['business_profile', 'service_product_menu', 'inquiry_quote_form', 'photo_file_upload', 'notifications', 'review_request_system'],
  education_coaching_instruction: ['business_profile', 'service_product_menu', 'inquiry_quote_form', 'booking_request_system', 'student_profiles', 'resource_library_faq', 'notifications'],
  health_adjacent_professionals: ['business_profile', 'service_product_menu', 'inquiry_quote_form', 'booking_request_system', 'document_checklist_intake', 'resource_library_faq', 'notifications'],
  local_retail_boutique: ['business_profile', 'service_product_menu', 'qr_code_setup', 'notifications', 'review_request_system'],
  professional_local_services: ['business_profile', 'service_product_menu', 'inquiry_quote_form', 'document_checklist_intake', 'resource_library_faq', 'notifications'],
}

// ─── Data-authoring shorthands (keep the 150+ rows readable) ─────────────────

// product: name, category, price, status, notes, availableCount
const p = (name, category, price, status = 'available', notes = null, availableCount = null) =>
  ({ name, category, price, status, notes, availableCount })

// customer: name, phone, email, signupSource, smsConsent, interests
const c = (name, phone, email, signupSource = 'qr', smsConsent = true, interests = []) =>
  ({ name, phone, email, signupSource, smsConsent, interests })

// ─── The 12 demo clients ─────────────────────────────────────────────────────
// Each: identity + branding + one location + one daily_status + products +
// customers + a lead-surface activity list + (where the vertical enables it) a
// profile table + document checklist. Profiles/activity reference customers by
// 0-based index into `customers`; preorder/booking link to products/profiles by
// index too. Colours + fonts are each business's own believable identity.

export const CLIENTS = [
  // 1 ── personal_care_appointment ── booking-led
  {
    n: 1, slug: 'demo-salon', vertical: 'personal_care_appointment', tier: 2,
    business_name: 'Fern & Fox Hair Studio',
    operator_email: 'hello@fernandfox.demo', operator_phone: '+16045550101',
    branding: {
      primary_color: '#6b3f5b', secondary_color: '#b98ba5', accent_color: '#d9b26a',
      font_theme: 'minimal', app_name: 'Fern & Fox', tagline: 'Colour, cuts & care in the heart of Riverdale',
    },
    location: {
      display_name: 'Fern & Fox Studio', address: '212 Logan Ave, Toronto, ON',
      lat: 43.6602, lng: -79.3416, parking_notes: 'Green P lot one block north; street parking after 6pm.',
    },
    status: { hours_open: '10:00', hours_close: '19:00', custom_message: 'Booking August colour appointments now.' },
    products: [
      p("Women's Cut & Style", 'Cuts', 75, 'available'),
      p("Men's Cut", 'Cuts', 45, 'available'),
      p('Full Balayage', 'Colour', 210, 'available'),
      p('Root Touch-Up', 'Colour', 95, 'available'),
      p('Gloss & Tone', 'Colour', 65, 'low', 'Limited weekend slots', 3),
      p('Bridal Trial + Day-of', 'Special', 350, 'available'),
      p('Deep Conditioning Treatment', 'Add-ons', 30, 'available'),
      p('Kids Cut (under 12)', 'Cuts', 30, 'available'),
      p('Blow-Dry & Style', 'Styling', 55, 'available'),
      p('Special-Occasion Updo', 'Styling', 90, 'sold_out', 'Fully booked this weekend', 0),
    ],
    customers: [
      c('Amara Osei', '+16045550111', 'amara@example.demo', 'qr', true, ['Colour']),
      c('Priya Nair', '+16045550112', 'priya@example.demo', 'website', true, ['Cuts']),
      c('Jordan Blake', '+16045550113', 'jordan@example.demo', 'app', false, ['Styling']),
      c('Michelle Tran', '+16045550114', 'michelle@example.demo', 'qr', true, ['Special']),
    ],
    leadSurface: 'bookings',
    activity: [
      { customer: 0, service: 'Full Balayage', dateOffset: 4, time: '11:00 AM', status: 'confirmed', notes: 'Going two shades lighter.' },
      { customer: 1, service: "Women's Cut & Style", dateOffset: 2, time: '2:30 PM', status: 'requested', notes: null },
      { customer: 3, service: 'Bridal Trial + Day-of', dateOffset: 20, time: '9:00 AM', status: 'confirmed', notes: 'Wedding is the 25th.' },
    ],
  },

  // 2 ── home_service_trades ── inquiry/quote-led
  {
    n: 2, slug: 'demo-trades', vertical: 'home_service_trades', tier: 2,
    business_name: 'Rivertown Plumbing & Heating',
    operator_email: 'dispatch@rivertownplumbing.demo', operator_phone: '+16135550102',
    branding: {
      primary_color: '#1d4e89', secondary_color: '#3b82c4', accent_color: '#f2870d',
      font_theme: 'modern_sans', app_name: 'Rivertown Plumbing', tagline: 'Licensed plumbing & heating, on time or it’s free',
    },
    location: {
      display_name: 'Rivertown Service Yard', address: '48 Bank St, Ottawa, ON',
      lat: 45.4201, lng: -75.6989, parking_notes: 'Trucks dispatched from yard; no walk-in counter.',
    },
    status: { hours_open: '07:00', hours_close: '18:00', custom_message: '24/7 emergency line for burst pipes.' },
    products: [
      p('Emergency Call-Out', 'Emergency', 149, 'available', 'Same-day, 2-hour arrival window'),
      p('Water Heater Replacement', 'Installation', 1850, 'available'),
      p('Drain Cleaning / Snaking', 'Repair', 220, 'available'),
      p('Faucet or Fixture Install', 'Installation', 180, 'available'),
      p('Sump Pump Install', 'Installation', 950, 'low', 'Two units left in stock', 2),
      p('Furnace Tune-Up', 'Heating', 165, 'available'),
      p('Leak Detection', 'Repair', 195, 'available'),
      p('Toilet Repair / Replace', 'Repair', 240, 'available'),
      p('Backflow Testing', 'Inspection', 130, 'available'),
      p('Annual Maintenance Plan', 'Plans', 299, 'available'),
    ],
    customers: [
      c('Greg Halvorsen', '+16135550121', 'greg@example.demo', 'website', true, ['Emergency']),
      c('Sandra Whitfield', '+16135550122', 'sandra@example.demo', 'qr', true, ['Heating']),
      c('The Kowalski Family', '+16135550123', 'kowalski@example.demo', 'website', false, ['Installation']),
    ],
    leadSurface: 'inquiries',
    activity: [
      { customer: 0, service_category: 'Emergency', job_location: 'Old Ottawa South', urgency: 'asap', description: 'Basement flooding from a burst supply line under the kitchen sink.', contact: 'phone', status: 'contacted', preferredDateOffset: 0 },
      { customer: 1, service_category: 'Heating', job_location: 'Westboro', urgency: 'this_week', description: 'Furnace making a rattling noise and short-cycling. Want a tune-up before winter.', contact: 'sms', status: 'quoted', preferredDateOffset: 5 },
      { customer: 2, service_category: 'Installation', job_location: 'Barrhaven', urgency: 'this_month', description: 'Replacing a 14-year-old water heater. Prefer a tankless option if cost is reasonable.', contact: 'email', status: 'new', preferredDateOffset: 12 },
    ],
  },

  // 3 ── food_producers_specialty_makers ── preorder-led
  {
    n: 3, slug: 'demo-maker', vertical: 'food_producers_specialty_makers', tier: 1,
    business_name: 'Ember Hot Sauce Co.',
    operator_email: 'orders@emberhotsauce.demo', operator_phone: '+15145550103',
    branding: {
      primary_color: '#9c2b1b', secondary_color: '#d64525', accent_color: '#f4a71d',
      font_theme: 'rustic', app_name: 'Ember Hot Sauce', tagline: 'Small-batch heat, made in Montréal',
    },
    location: {
      display_name: 'Ember Commissary Kitchen', address: '5555 Rue Saint-Patrick, Montréal, QC',
      lat: 45.4728, lng: -73.5817, parking_notes: 'Pickup Thursdays 4–7pm at the loading door.',
    },
    status: { hours_open: '16:00', hours_close: '19:00', custom_message: 'Batch #24 pickup this Thursday — reserve now.' },
    products: [
      p('Ember Original (Medium)', 'Hot Sauce', 12, 'available'),
      p('Smoked Ghost (Hot)', 'Hot Sauce', 14, 'available'),
      p('Maple Habanero', 'Hot Sauce', 13, 'low', 'Seasonal — nearly out', 4),
      p('Verde Jalapeño', 'Hot Sauce', 12, 'available'),
      p('Carolina Reaper (Extra Hot)', 'Hot Sauce', 15, 'sold_out', 'Sold out — next batch in two weeks', 0),
      p('3-Bottle Gift Box', 'Bundles', 36, 'available'),
      p('Chili Crisp', 'Pantry', 11, 'available'),
      p('Fermented Hot Honey', 'Pantry', 14, 'low', 'Limited jars', 6),
      p('Ember T-Shirt', 'Merch', 28, 'available'),
    ],
    customers: [
      c('Luc Bergeron', '+15145550131', 'luc@example.demo', 'qr', true, ['Hot Sauce']),
      c('Fatima Haddad', '+15145550132', 'fatima@example.demo', 'website', true, ['Bundles']),
      c('Devon Clarke', '+15145550133', 'devon@example.demo', 'app', true, ['Pantry']),
      c('Émilie Roy', '+15145550134', 'emilie@example.demo', 'qr', false, ['Hot Sauce']),
    ],
    leadSurface: 'preorders',
    activity: [
      { customer: 0, status: 'confirmed', notes: 'Add extra napkins 😄', items: [[0, 2], [1, 1]], pickupOffset: 3 },
      { customer: 1, status: 'pending', notes: null, items: [[5, 1]], pickupOffset: 3 },
      { customer: 2, status: 'completed', notes: 'Regular — keep the usual ready.', items: [[6, 2], [7, 1]], pickupOffset: -4 },
    ],
  },

  // 4 ── mobile_popup_sellers ── status + preorder-led
  {
    n: 4, slug: 'demo-popup', vertical: 'mobile_popup_sellers', tier: 1,
    business_name: 'Bloom Cart Flowers',
    operator_email: 'hello@bloomcart.demo', operator_phone: '+16045550104',
    branding: {
      primary_color: '#b14a7a', secondary_color: '#e79bbf', accent_color: '#5a8f5a',
      font_theme: 'farmhouse', app_name: 'Bloom Cart', tagline: 'A flower cart that finds you',
    },
    location: {
      display_name: 'Today: Kitsilano Farmers Market', address: '2690 Larch St, Vancouver, BC',
      lat: 49.2646, lng: -123.1662, parking_notes: 'Look for the pink cart near the west entrance.',
    },
    status: { hours_open: '09:00', hours_close: '14:00', custom_message: 'At Kits Market today until 2pm 🌸' },
    products: [
      p('Market Bunch', 'Bouquets', 18, 'available'),
      p("Designer's Choice Bouquet", 'Bouquets', 35, 'available'),
      p('Single-Stem Peonies (each)', 'Stems', 6, 'low', 'A dozen left', 12),
      p('Ranunculus Bunch', 'Stems', 22, 'available'),
      p('Dried Bouquet', 'Bouquets', 28, 'available'),
      p('Posy Jar', 'Bouquets', 24, 'available'),
      p('Wildflower Wrap', 'Bouquets', 30, 'sold_out', 'Sold out for today', 0),
      p('Add a Card & Ribbon', 'Add-ons', 4, 'available'),
      p('Weekly Flower Subscription', 'Subscriptions', 45, 'available'),
    ],
    customers: [
      c('Hannah Wu', '+16045550141', 'hannah@example.demo', 'qr', true, ['Bouquets']),
      c('Marco Reyes', '+16045550142', 'marco@example.demo', 'qr', true, ['Subscriptions']),
      c('Beatrice Lund', '+16045550143', 'bea@example.demo', 'app', true, ['Stems']),
    ],
    leadSurface: 'preorders',
    activity: [
      { customer: 0, status: 'confirmed', notes: 'Pickup at the cart around noon.', items: [[1, 1]], pickupOffset: 0 },
      { customer: 1, status: 'pending', notes: 'Anniversary — lots of pink please.', items: [[1, 1], [7, 1]], pickupOffset: 0 },
    ],
  },

  // 5 ── pet_animal_services ── booking-led + pet profiles
  {
    n: 5, slug: 'demo-pet', vertical: 'pet_animal_services', tier: 2,
    business_name: 'Wag & Wash Mobile Grooming',
    operator_email: 'book@wagandwash.demo', operator_phone: '+14035550105',
    branding: {
      primary_color: '#0f766e', secondary_color: '#3aa99f', accent_color: '#f6b93b',
      font_theme: 'modern_sans', app_name: 'Wag & Wash', tagline: 'The spa that comes to your driveway',
    },
    location: {
      display_name: 'Wag & Wash (Mobile)', address: 'Serving SW Calgary, AB',
      lat: 51.0447, lng: -114.0719, parking_notes: 'We park the van; you just bring the pup out.',
    },
    status: { hours_open: '08:00', hours_close: '17:00', custom_message: 'Booking full grooms 1–2 weeks out.' },
    products: [
      p('Full Groom — Small Dog', 'Grooming', 75, 'available'),
      p('Full Groom — Large Dog', 'Grooming', 110, 'available'),
      p('Bath & Brush', 'Grooming', 45, 'available'),
      p('Nail Trim & Grind', 'Add-ons', 20, 'available'),
      p('De-Shed Treatment', 'Add-ons', 35, 'available'),
      p('Teeth Brushing', 'Add-ons', 15, 'available'),
      p('Puppy First Groom', 'Grooming', 55, 'available'),
      p('Cat Grooming', 'Grooming', 90, 'low', 'One cat-friendly slot per day', 1),
      p('Flea Treatment Bath', 'Add-ons', 40, 'available'),
    ],
    customers: [
      c('Owen Fitzgerald', '+14035550151', 'owen@example.demo', 'website', true, ['Grooming']),
      c('Rachel Mbeki', '+14035550152', 'rachel@example.demo', 'qr', true, ['Grooming']),
      c('Tom & Lisa Park', '+14035550153', 'parks@example.demo', 'app', true, ['Add-ons']),
    ],
    leadSurface: 'bookings',
    profiles: {
      table: 'pets',
      rows: [
        { customer: 0, name: 'Biscuit', breed: 'Golden Retriever', size: 'Large', age: '3 years', allergies: 'Sensitive to oatmeal shampoo', behavior_notes: 'Very friendly, wiggly during nail trims.', grooming_preferences: 'Teddy-bear trim, leave the tail full.', vaccination_info: 'Rabies + DHPP current (owner-reported).', emergency_contact: 'Owen — 403-555-0151', care_instructions: 'Treats after nails, please.' },
        { customer: 1, name: 'Nori', breed: 'Shih Tzu', size: 'Small', age: '6 years', allergies: 'None reported', behavior_notes: 'Nervous with dryers; go slow.', grooming_preferences: 'Short puppy cut, round face.', vaccination_info: 'Current (owner-reported).', emergency_contact: 'Rachel — 403-555-0152', care_instructions: null },
      ],
    },
    activity: [
      { customer: 0, service: 'Full Groom — Large Dog', dateOffset: 6, time: '10:00 AM', status: 'confirmed', notes: 'Biscuit — teddy-bear trim.', pet: 0 },
      { customer: 1, service: 'Bath & Brush', dateOffset: 3, time: '1:00 PM', status: 'requested', notes: 'Nori — go easy with the dryer.', pet: 1 },
      { customer: 2, service: 'Nail Trim & Grind', dateOffset: 1, time: '9:30 AM', status: 'confirmed', notes: null },
    ],
  },

  // 6 ── vehicle_equipment_services ── inquiry-led + vehicle profiles
  {
    n: 6, slug: 'demo-vehicle', vertical: 'vehicle_equipment_services', tier: 2,
    business_name: 'Apex Mobile Detailing',
    operator_email: 'quotes@apexdetailing.demo', operator_phone: '+16475550106',
    branding: {
      primary_color: '#1f2933', secondary_color: '#52606d', accent_color: '#e63946',
      font_theme: 'modern_sans', app_name: 'Apex Detailing', tagline: 'Showroom shine, in your driveway',
    },
    location: {
      display_name: 'Apex Mobile Detailing', address: 'Serving the GTA, ON',
      lat: 43.7315, lng: -79.7624, parking_notes: 'We need a driveway or spot with a water source nearby.',
    },
    status: { hours_open: '08:00', hours_close: '18:00', custom_message: 'Ceramic-coating bookings open for fall.' },
    products: [
      p('Express Exterior Wash', 'Exterior', 60, 'available'),
      p('Full Interior Detail', 'Interior', 180, 'available'),
      p('Complete Inside & Out', 'Packages', 260, 'available'),
      p('Ceramic Coating (2-yr)', 'Protection', 750, 'low', 'Two install days left this month', 2),
      p('Paint Correction (1-step)', 'Paint', 400, 'available'),
      p('Engine Bay Cleaning', 'Add-ons', 70, 'available'),
      p('Pet Hair Removal', 'Add-ons', 45, 'available'),
      p('Headlight Restoration', 'Add-ons', 90, 'available'),
      p('Fleet / Multi-Vehicle Quote', 'Commercial', null, 'available', 'Request a custom quote'),
    ],
    customers: [
      c('Nadia Fernandes', '+16475550161', 'nadia@example.demo', 'website', true, ['Packages']),
      c('Chris Onyeka', '+16475550162', 'chris@example.demo', 'qr', true, ['Protection']),
      c('Sam Delgado', '+16475550163', 'sam@example.demo', 'website', false, ['Interior']),
    ],
    leadSurface: 'inquiries',
    profiles: {
      table: 'vehicles',
      rows: [
        { customer: 0, make: 'Toyota', model: 'RAV4', year: 2021, color: 'Silver', mileage: 48000, notes: 'Dog rides in the back — lots of hair.' },
        { customer: 1, make: 'Tesla', model: 'Model 3', year: 2023, color: 'Deep Blue', mileage: 15000, notes: 'Wants ceramic coating on fresh paint.' },
      ],
    },
    activity: [
      { customer: 0, service_category: 'Interior', job_location: 'Vaughan', urgency: 'this_week', description: 'Full interior detail — heavy dog hair and some coffee stains on the seats.', contact: 'sms', status: 'quoted', preferredDateOffset: 4, vehicle: 0 },
      { customer: 1, service_category: 'Protection', job_location: 'Markham', urgency: 'this_month', description: 'New Model 3, want the 2-year ceramic coating package. What prep is included?', contact: 'email', status: 'contacted', preferredDateOffset: 10, vehicle: 1 },
    ],
  },

  // 7 ── creative_event_services ── inquiry-led
  {
    n: 7, slug: 'demo-creative', vertical: 'creative_event_services', tier: 2,
    business_name: 'Northlight Photography',
    operator_email: 'studio@northlightphoto.demo', operator_phone: '+17805550107',
    branding: {
      primary_color: '#2b2b2b', secondary_color: '#6b6b6b', accent_color: '#c9a227',
      font_theme: 'classic_serif', app_name: 'Northlight', tagline: 'Weddings, portraits & brand stories',
    },
    location: {
      display_name: 'Northlight Studio', address: '10310 82 Ave NW, Edmonton, AB',
      lat: 53.5186, lng: -113.5012, parking_notes: 'Studio sessions by appointment; free lot behind the building.',
    },
    status: { hours_open: '10:00', hours_close: '18:00', custom_message: 'Booking 2026 weddings — limited dates.' },
    products: [
      p('Wedding — Full Day', 'Weddings', 3200, 'available'),
      p('Wedding — Elopement', 'Weddings', 1400, 'available'),
      p('Engagement Session', 'Portraits', 450, 'available'),
      p('Family Portrait Session', 'Portraits', 350, 'available'),
      p('Personal Branding Session', 'Commercial', 600, 'available'),
      p('Newborn Session', 'Portraits', 400, 'low', 'One studio slot per week', 1),
      p('Product Photography (per 10)', 'Commercial', 250, 'available'),
      p('Event Coverage (hourly)', 'Events', 275, 'available'),
      p('Prints & Album Add-On', 'Add-ons', 320, 'available'),
    ],
    customers: [
      c('Sophie & Aaron Bell', '+17805550171', 'bellwedding@example.demo', 'website', true, ['Weddings']),
      c('Grace Adeyemi', '+17805550172', 'grace@example.demo', 'qr', true, ['Commercial']),
      c('The Nguyen Family', '+17805550173', 'nguyen@example.demo', 'website', true, ['Portraits']),
    ],
    leadSurface: 'inquiries',
    activity: [
      { customer: 0, service_category: 'Weddings', job_location: 'Jasper, AB', urgency: 'flexible', description: 'Mountain wedding next July, ~90 guests. Looking for full-day coverage plus an engagement session.', contact: 'email', status: 'quoted', preferredDateOffset: 30 },
      { customer: 1, service_category: 'Commercial', job_location: 'Downtown Edmonton', urgency: 'this_month', description: 'Personal branding shoot for a new consulting site — need ~15 edited images.', contact: 'email', status: 'contacted', preferredDateOffset: 14 },
    ],
  },

  // 8 ── education_coaching_instruction ── booking-led (no student table → no profile rows)
  {
    n: 8, slug: 'demo-education', vertical: 'education_coaching_instruction', tier: 2,
    business_name: 'Keynote Music Lessons',
    operator_email: 'lessons@keynotemusic.demo', operator_phone: '+12045550108',
    branding: {
      primary_color: '#1e3a5f', secondary_color: '#3f6791', accent_color: '#d98324',
      font_theme: 'classic_serif', app_name: 'Keynote Music', tagline: 'Piano, guitar & voice — all ages',
    },
    location: {
      display_name: 'Keynote Studio', address: '245 McDermot Ave, Winnipeg, MB',
      lat: 49.8994, lng: -97.1392, parking_notes: 'Metered street parking; free after 5:30pm.',
    },
    status: { hours_open: '14:00', hours_close: '20:00', custom_message: 'Fall term spots filling — book a trial lesson.' },
    products: [
      p('Trial Lesson (30 min)', 'Lessons', 25, 'available'),
      p('Piano — Private (30 min)', 'Piano', 40, 'available'),
      p('Piano — Private (60 min)', 'Piano', 70, 'available'),
      p('Guitar — Private (30 min)', 'Guitar', 40, 'available'),
      p('Voice — Private (45 min)', 'Voice', 55, 'available'),
      p('Group Theory Class', 'Classes', 30, 'low', 'Two seats left in the fall cohort', 2),
      p('4-Lesson Package', 'Packages', 150, 'available'),
      p('Recital Prep Intensive', 'Packages', 200, 'available'),
      p('Adult Beginner Bundle', 'Packages', 260, 'available'),
    ],
    customers: [
      c('The Dubois Family', '+12045550181', 'dubois@example.demo', 'website', true, ['Piano']),
      c('Isaac Rosenthal', '+12045550182', 'isaac@example.demo', 'qr', true, ['Guitar']),
      c('Mei-Ling Chow', '+12045550183', 'meiling@example.demo', 'app', true, ['Voice']),
    ],
    leadSurface: 'bookings',
    activity: [
      { customer: 0, service: 'Trial Lesson (30 min)', dateOffset: 3, time: '4:00 PM', status: 'confirmed', notes: 'For our 8-year-old, first time on piano.' },
      { customer: 1, service: 'Guitar — Private (30 min)', dateOffset: 5, time: '6:30 PM', status: 'requested', notes: 'Wants to learn fingerstyle.' },
      { customer: 2, service: 'Voice — Private (45 min)', dateOffset: 2, time: '5:15 PM', status: 'confirmed', notes: null },
    ],
  },

  // 9 ── health_adjacent_professionals ── booking-led + document checklist
  {
    n: 9, slug: 'demo-health', vertical: 'health_adjacent_professionals', tier: 2,
    business_name: 'Stillwater Massage Therapy',
    operator_email: 'care@stillwatermassage.demo', operator_phone: '+19025550109',
    branding: {
      primary_color: '#4a6b57', secondary_color: '#7fa08c', accent_color: '#cdb891',
      font_theme: 'minimal', app_name: 'Stillwater RMT', tagline: 'Registered massage therapy — direct billing',
    },
    location: {
      display_name: 'Stillwater Wellness', address: '1478 Queen St, Halifax, NS',
      lat: 44.6418, lng: -63.5784, parking_notes: 'Accessible entrance off the side lot.',
    },
    status: { hours_open: '09:00', hours_close: '18:00', custom_message: 'Direct billing available for most insurers.' },
    products: [
      p('60-min Therapeutic Massage', 'Massage', 95, 'available'),
      p('90-min Therapeutic Massage', 'Massage', 130, 'available'),
      p('45-min Focused Treatment', 'Massage', 75, 'available'),
      p('Prenatal Massage', 'Massage', 100, 'available'),
      p('Deep Tissue', 'Massage', 105, 'available'),
      p('Hot Stone Add-On', 'Add-ons', 20, 'available'),
      p('Cupping Add-On', 'Add-ons', 25, 'low', 'Limited weekly slots', 3),
      p('Initial Assessment + Treatment', 'Assessment', 120, 'available'),
      p('5-Session Package', 'Packages', 440, 'available'),
    ],
    customers: [
      c('Elena Popescu', '+19025550191', 'elena@example.demo', 'website', true, ['Massage']),
      c('Marcus Bell', '+19025550192', 'marcusb@example.demo', 'qr', true, ['Assessment']),
      c('Farah Aziz', '+19025550193', 'farah@example.demo', 'app', true, ['Massage']),
    ],
    leadSurface: 'bookings',
    docChecklist: [
      { title: 'Completed Intake Form', description: 'Health history and consent — emailed after you book.', required: true, needs_upload: true },
      { title: 'Insurance / Benefits Card', description: 'For direct billing, upload a photo of your benefits card.', required: false, needs_upload: true },
      { title: 'Doctor’s Referral (if applicable)', description: 'Only if your insurer requires one.', required: false, needs_upload: true },
      { title: 'Arrive 10 Minutes Early', description: 'First visit only — to review your intake together.', required: true, needs_upload: false },
    ],
    activity: [
      { customer: 0, service: 'Initial Assessment + Treatment', dateOffset: 2, time: '10:00 AM', status: 'confirmed', notes: 'Lower-back tension from desk work.' },
      { customer: 1, service: '60-min Therapeutic Massage', dateOffset: 4, time: '3:00 PM', status: 'requested', notes: null },
      { customer: 2, service: '90-min Therapeutic Massage', dateOffset: 7, time: '1:30 PM', status: 'confirmed', notes: 'Prefers medium pressure.' },
    ],
  },

  // 10 ── local_retail_boutique ── product-menu (holds/reservations as activity)
  {
    n: 10, slug: 'demo-retail', vertical: 'local_retail_boutique', tier: 1,
    business_name: 'Marigold Home Goods',
    operator_email: 'shop@marigoldhome.demo', operator_phone: '+13065550110',
    branding: {
      primary_color: '#b4552d', secondary_color: '#d98a5f', accent_color: '#3f6d54',
      font_theme: 'farmhouse', app_name: 'Marigold', tagline: 'Curated home goods & gifts',
    },
    location: {
      display_name: 'Marigold Home Goods', address: '312 Broadway Ave, Saskatoon, SK',
      lat: 52.1189, lng: -106.6606, parking_notes: 'Free 2-hour parking along Broadway.',
    },
    status: { hours_open: '10:00', hours_close: '18:00', custom_message: 'New fall linens just arrived in store.' },
    products: [
      p('Stoneware Mug', 'Kitchen', 24, 'available'),
      p('Linen Tea Towel Set', 'Kitchen', 32, 'available'),
      p('Soy Candle — Cedar', 'Home Fragrance', 28, 'available'),
      p('Wool Throw Blanket', 'Textiles', 95, 'low', 'A few left in oatmeal', 3),
      p('Ceramic Vase', 'Decor', 48, 'available'),
      p('Handwoven Basket', 'Decor', 42, 'available'),
      p('Botanical Print (framed)', 'Wall Art', 65, 'available'),
      p('Beeswax Wrap Trio', 'Kitchen', 22, 'available'),
      p('Gift Box — "Cozy Night In"', 'Gifts', 78, 'sold_out', 'Restocking next week', 0),
      p('Local Honey (500g)', 'Pantry', 16, 'available'),
    ],
    customers: [
      c('Dana Whitecloud', '+13065550201', 'dana@example.demo', 'qr', true, ['Gifts']),
      c('Peter Salzmann', '+13065550202', 'peter@example.demo', 'website', true, ['Decor']),
      c('Yuki Tanaka', '+13065550203', 'yuki@example.demo', 'qr', true, ['Textiles']),
    ],
    leadSurface: 'preorders',
    activity: [
      { customer: 0, status: 'confirmed', notes: 'Holding the gift box — will pick up Saturday.', items: [[7, 1], [9, 1]], pickupOffset: 2 },
      { customer: 2, status: 'pending', notes: 'Reserve the oatmeal throw please.', items: [[3, 1]], pickupOffset: 1 },
    ],
  },

  // 11 ── professional_local_services ── inquiry-led + document checklist
  {
    n: 11, slug: 'demo-pro', vertical: 'professional_local_services', tier: 2,
    business_name: 'Ledger & Co. Bookkeeping',
    operator_email: 'hello@ledgerco.demo', operator_phone: '+16045550111',
    branding: {
      primary_color: '#12433a', secondary_color: '#2f7d6b', accent_color: '#c9a24b',
      font_theme: 'classic_serif', app_name: 'Ledger & Co.', tagline: 'Bookkeeping & tax prep for small business',
    },
    location: {
      display_name: 'Ledger & Co. (Remote + by appt)', address: '1090 W Georgia St, Vancouver, BC',
      lat: 49.2861, lng: -123.1213, parking_notes: 'Video consults available; office visits by appointment.',
    },
    status: { hours_open: '09:00', hours_close: '17:00', custom_message: 'Onboarding new monthly clients for Q4.' },
    products: [
      p('Monthly Bookkeeping — Starter', 'Bookkeeping', 250, 'available'),
      p('Monthly Bookkeeping — Growth', 'Bookkeeping', 450, 'available'),
      p('Catch-Up Bookkeeping (per month)', 'Bookkeeping', 120, 'available'),
      p('Year-End Financials', 'Tax', 600, 'available'),
      p('Personal Tax Return', 'Tax', 150, 'available'),
      p('Small-Business Tax Return', 'Tax', 500, 'available'),
      p('GST/HST Filing', 'Compliance', 90, 'available'),
      p('Payroll Setup', 'Payroll', 300, 'low', 'Limited Q4 onboarding slots', 2),
      p('QuickBooks Cleanup', 'Advisory', 400, 'available'),
      p('Advisory Call (hourly)', 'Advisory', 130, 'available'),
    ],
    customers: [
      c('Brightline Cafe', '+16045550211', 'owner@brightlinecafe.demo', 'website', true, ['Bookkeeping']),
      c('Nadia’s Salon', '+16045550212', 'nadia@nadiasalon.demo', 'qr', true, ['Tax']),
      c('Peak Fitness Studio', '+16045550213', 'admin@peakfitness.demo', 'website', false, ['Payroll']),
    ],
    leadSurface: 'inquiries',
    docChecklist: [
      { title: 'Prior-Year Tax Return', description: 'Last filed return for your business.', required: true, needs_upload: true },
      { title: 'Bank & Credit-Card Statements', description: 'All business accounts, most recent 12 months.', required: true, needs_upload: true },
      { title: 'Payroll Summary', description: 'If you have employees.', required: false, needs_upload: true },
      { title: 'Business Number / GST Number', description: 'Have it handy for the first call.', required: true, needs_upload: false },
      { title: 'Accounting Software Access', description: 'QuickBooks/Xero invite, if you use one.', required: false, needs_upload: false },
    ],
    activity: [
      { customer: 0, service_category: 'Bookkeeping', job_location: 'Kitsilano', urgency: 'this_month', description: 'Cafe doing ~$40k/mo, currently on shoebox spreadsheets. Want monthly bookkeeping + GST filing.', contact: 'email', status: 'quoted', preferredDateOffset: 7 },
      { customer: 2, service_category: 'Payroll', job_location: 'Remote', urgency: 'this_week', description: 'Adding 4 part-time staff, need payroll set up before next pay run.', contact: 'phone', status: 'contacted', preferredDateOffset: 3 },
    ],
  },

  // 12 ── home_property_maintenance ── inquiry-led + property profiles
  {
    n: 12, slug: 'demo-property', vertical: 'home_property_maintenance', tier: 2,
    business_name: 'Greenfield Lawn & Snow',
    operator_email: 'service@greenfieldlawn.demo', operator_phone: '+15195550112',
    branding: {
      primary_color: '#2f5d34', secondary_color: '#4f8a4f', accent_color: '#d7a12c',
      font_theme: 'rustic', app_name: 'Greenfield', tagline: 'Lawn care in summer, snow clearing all winter',
    },
    location: {
      display_name: 'Greenfield Lawn & Snow', address: 'Serving London, ON & area',
      lat: 42.9849, lng: -81.2453, parking_notes: 'Crews dispatched by route; no walk-in office.',
    },
    status: { hours_open: '07:00', hours_close: '19:00', custom_message: 'Booking fall cleanups & winter snow contracts.' },
    products: [
      p('Weekly Lawn Mowing', 'Lawn', 45, 'available'),
      p('Spring / Fall Cleanup', 'Seasonal', 220, 'available'),
      p('Aeration & Overseeding', 'Lawn', 180, 'available'),
      p('Fertilizer Program (season)', 'Lawn', 320, 'available'),
      p('Hedge & Shrub Trimming', 'Garden', 140, 'available'),
      p('Mulch Install (per yard)', 'Garden', 95, 'low', 'Limited mulch delivery days left', 4),
      p('Seasonal Snow Contract', 'Snow', 650, 'available'),
      p('Per-Visit Snow Clearing', 'Snow', 60, 'available'),
      p('Salting / Ice Melt', 'Snow', 40, 'available'),
      p('Gutter Cleaning', 'Seasonal', 130, 'available'),
    ],
    customers: [
      c('Robert Ashby', '+15195550221', 'robert@example.demo', 'website', true, ['Lawn']),
      c('Priscilla Owens', '+15195550222', 'priscilla@example.demo', 'qr', true, ['Snow']),
      c('The Verma Household', '+15195550223', 'verma@example.demo', 'website', true, ['Seasonal']),
    ],
    leadSurface: 'inquiries',
    profiles: {
      table: 'properties',
      rows: [
        { customer: 0, address: '77 Maple Grove Cres, London, ON', gate_code: null, parking_instructions: 'Park on the street, not the driveway.', pets_on_site: 'Friendly dog in the backyard — text before arriving.', access_notes: 'Side gate latch sticks; lift and pull.', preferred_service_day: 'Thursday', lawn_size: 'Approx 5,000 sq ft', snow_removal_areas: 'Driveway + front walk', cleaning_instructions: null, safety_notes: 'Watch the sprinkler heads near the front bed.' },
        { customer: 1, address: '12 Riverbend Rd, London, ON', gate_code: '4821', parking_instructions: 'Use the visitor spot by the garage.', pets_on_site: 'None', access_notes: 'Backyard accessed through the garage side door.', preferred_service_day: 'Monday', lawn_size: 'Corner lot, approx 8,000 sq ft', snow_removal_areas: 'Long driveway + both walkways', cleaning_instructions: null, safety_notes: 'Steep driveway — salt first in freezing rain.' },
      ],
    },
    activity: [
      { customer: 1, service_category: 'Snow', job_location: 'Riverbend', urgency: 'this_month', description: 'Want a seasonal snow contract for a long driveway plus both walkways. Corner lot.', contact: 'sms', status: 'quoted', preferredDateOffset: 15, property: 1 },
      { customer: 0, service_category: 'Seasonal', job_location: 'Maple Grove', urgency: 'this_week', description: 'Fall cleanup — leaves and cutting back the perennial beds. Dog in the yard.', contact: 'phone', status: 'contacted', preferredDateOffset: 5, property: 0 },
    ],
  },
]
