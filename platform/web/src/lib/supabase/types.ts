export type Vertical = 'produce_seller' | 'baker' | 'cleaner' | 'welder'
export type Tier = 1 | 2 | 3
export type FontTheme = 'modern_sans' | 'farmhouse' | 'classic_serif' | 'minimal' | 'rustic'
export type ProductStatus = 'available' | 'low' | 'sold_out'
export type DailyStatusValue = 'open' | 'closed' | 'sold_out' | 'back_tomorrow' | 'weather_delay' | 'opening_soon'
export type SignupSource = 'qr' | 'website' | 'app'
export type NotificationChannel = 'sms' | 'email' | 'push' | 'whatsapp'
export type PreorderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type TollFreeVerificationStatus = 'not_started' | 'pending_review' | 'in_review' | 'approved' | 'rejected'

export interface Client {
  id: string
  slug: string
  business_name: string
  vertical: Vertical
  tier: Tier
  operator_email: string
  operator_phone: string | null
  active: boolean
  paused: boolean
  region: string
  created_at: string
}

export interface ClientBranding {
  client_id: string
  primary_color: string
  secondary_color: string | null
  accent_color: string | null
  font_theme: FontTheme
  logo_url: string | null
  app_icon_url: string | null
  splash_url: string | null
  app_name: string | null
  tagline: string | null
  hero_photo_urls: string[]
  custom_domain: string | null
  apple_bundle_id: string | null
  android_package: string | null
  theme_version: number
}

export interface Location {
  client_id: string
  id: string
  display_name: string
  address: string | null
  lat: number | null
  lng: number | null
  map_url: string | null
  parking_notes: string | null
}

export interface Product {
  client_id: string
  id: string
  name: string
  category: string | null
  price: number | null
  bundle_description: string | null
  status: ProductStatus
  available_count: number | null
  quantity_limit: number | null
  hold_until: string | null
  image_url: string | null
  notes: string | null
  sort_order: number
}

export interface DailyStatus {
  client_id: string
  id: string
  date: string
  status: DailyStatusValue
  hours_open: string | null
  hours_close: string | null
  location_id: string | null
  custom_message: string | null
  updated_at: string
}

export interface Customer {
  client_id: string
  id: string
  name: string
  phone: string | null
  email: string | null
  sms_consent: boolean
  email_consent: boolean
  apns_token: string | null
  fcm_token: string | null
  whatsapp_consent: boolean
  signup_source: SignupSource | null
  consent_timestamp: string
  consent_text_version: string
  consent_ip_hash: string
  product_interests: string[]
}

export interface Preorder {
  client_id: string
  id: string
  customer_id: string
  pickup_window_start: string | null
  pickup_window_end: string | null
  status: PreorderStatus
  notes: string | null
  created_at: string
  hold_until: string
}

export interface PreorderItem {
  client_id: string
  preorder_id: string
  product_id: string
  quantity: number
}

export interface Announcement {
  client_id: string
  id: string
  headline: string
  body: string | null
  published_at: string | null
  channels: string[]
  product_tags: string[]
  sent: boolean
}

export interface NotificationLog {
  client_id: string
  id: string
  customer_id: string | null
  channel: NotificationChannel
  message_preview: string | null
  sent_at: string
  status: string
  provider_message_id: string | null
  twilio_subaccount_sid: string | null
}

export interface TwilioSubaccount {
  client_id: string
  account_sid: string
  auth_token: string
  phone_number: string | null
  phone_number_sid: string | null
  messaging_service_sid: string | null
  toll_free_verification_sid: string | null
  verification_status: TollFreeVerificationStatus
  verification_submitted_at: string | null
  verification_updated_at: string | null
  verification_detail: Record<string, unknown> | null
  created_at: string
}

export interface ClientWithBranding extends Client {
  client_branding: ClientBranding | null
}

export interface DailyStatusWithLocation extends DailyStatus {
  locations: Location | null
}
