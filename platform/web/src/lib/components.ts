// Shared component-key registry (Tier 0 gating).
//
// These 25 keys are duplicated as plain constants across every app target —
// ios-seller/ios-customer (ComponentKeys.swift), android-seller/android-customer
// (ComponentKeys.kt) — same "duplicate the static data" approach as the archetype
// list in website/index.html. 25 strings don't warrant a codegen/shared-package
// pipeline. Keep the four copies in sync by hand when adding a component.
//
// A client's enabled set lives in clients.enabled_components (text[]). Because
// the clients table is service_role_only, seller surfaces read it through
// GET /api/seller/components — see useEnabledComponents (web) and ComponentsService
// (mobile). Admin toggles it via PATCH /api/admin/clients/[clientId]/components.

import type { Vertical } from './supabase/types'

export const COMPONENT_KEYS = [
  'business_profile',
  'service_product_menu',
  'inquiry_quote_form',
  'booking_request_system',
  'review_request_system',
  'customer_database',
  'qr_code_setup',
  'photo_file_upload',
  'payments_deposits',
  'admin_dashboard',
  'notifications',
  'status_tracker',
  'product_inventory',
  'recurring_schedule',
  'location_pop_up_tracker',
  'packages_memberships',
  'loyalty_rewards_referrals',
  'resource_library_faq',
  'document_checklist_intake',
  'pet_profiles',
  'vehicle_profiles',
  'property_profiles',
  'student_profiles',
  'advanced_analytics',
  'automation_ai_workflows',
] as const

export type ComponentKey = (typeof COMPONENT_KEYS)[number]

// Human labels for the admin toggle UI.
export const COMPONENT_LABELS: Record<ComponentKey, string> = {
  business_profile:          'Business Profile',
  service_product_menu:      'Service & Product Menu',
  inquiry_quote_form:        'Inquiry / Quote Form',
  booking_request_system:    'Booking Request System',
  review_request_system:     'Review Request System',
  customer_database:         'Customer Database',
  qr_code_setup:             'QR Code Setup',
  photo_file_upload:         'Photo & File Upload',
  payments_deposits:         'Payments / Deposits',
  admin_dashboard:           'Admin Dashboard',
  notifications:             'Notifications',
  status_tracker:            'Status Tracker',
  product_inventory:         'Product Inventory',
  recurring_schedule:        'Recurring Schedule',
  location_pop_up_tracker:   'Location / Pop-Up Tracker',
  packages_memberships:      'Packages / Memberships',
  loyalty_rewards_referrals: 'Loyalty / Rewards / Referrals',
  resource_library_faq:      'Resource Library / FAQ',
  document_checklist_intake: 'Document Checklist / Intake',
  pet_profiles:              'Pet Profiles',
  vehicle_profiles:          'Vehicle Profiles',
  property_profiles:         'Property Profiles',
  student_profiles:          'Student Profiles',
  advanced_analytics:        'Advanced Analytics',
  automation_ai_workflows:   'Automation / AI Workflows',
}

// Default component set a new client gets at creation, keyed by vertical, so
// signups don't need hand-picking. Derived from each archetype's `comp` list in
// website/index.html (ARCH). Admin can adjust afterward on the client detail page.
export const DEFAULT_COMPONENTS: Record<Vertical, ComponentKey[]> = {
  personal_care_appointment: [
    'business_profile', 'service_product_menu', 'booking_request_system',
    'notifications', 'review_request_system',
  ],
  home_service_trades: [
    'business_profile', 'service_product_menu', 'inquiry_quote_form',
    'photo_file_upload', 'notifications', 'review_request_system',
  ],
  home_property_maintenance: [
    'business_profile', 'service_product_menu', 'inquiry_quote_form',
    'recurring_schedule', 'property_profiles', 'notifications', 'review_request_system',
  ],
  food_producers_specialty_makers: [
    'business_profile', 'service_product_menu', 'product_inventory',
    'notifications', 'review_request_system',
  ],
  mobile_popup_sellers: [
    'business_profile', 'service_product_menu', 'admin_dashboard', 'status_tracker',
    'product_inventory', 'location_pop_up_tracker', 'qr_code_setup', 'notifications',
  ],
  pet_animal_services: [
    'business_profile', 'service_product_menu', 'booking_request_system',
    'pet_profiles', 'notifications', 'review_request_system',
  ],
  vehicle_equipment_services: [
    'business_profile', 'service_product_menu', 'inquiry_quote_form',
    'vehicle_profiles', 'photo_file_upload', 'notifications', 'review_request_system',
  ],
  creative_event_services: [
    'business_profile', 'service_product_menu', 'inquiry_quote_form',
    'photo_file_upload', 'notifications', 'review_request_system',
  ],
  education_coaching_instruction: [
    'business_profile', 'service_product_menu', 'inquiry_quote_form',
    'booking_request_system', 'student_profiles', 'resource_library_faq', 'notifications',
  ],
  health_adjacent_professionals: [
    'business_profile', 'service_product_menu', 'inquiry_quote_form',
    'booking_request_system', 'document_checklist_intake', 'resource_library_faq', 'notifications',
  ],
  local_retail_boutique: [
    'business_profile', 'service_product_menu', 'qr_code_setup',
    'notifications', 'review_request_system',
  ],
  professional_local_services: [
    'business_profile', 'service_product_menu', 'inquiry_quote_form',
    'document_checklist_intake', 'resource_library_faq', 'notifications',
  ],
}

export function hasComponent(enabled: string[] | null | undefined, key: ComponentKey): boolean {
  return !!enabled && enabled.includes(key)
}
