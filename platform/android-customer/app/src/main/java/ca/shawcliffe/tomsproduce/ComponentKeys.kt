package ca.shawcliffe.tomsproduce

// Shared component-key registry (Tier 0 gating). Hand-duplicated from
// platform/web/src/lib/components.ts. Keep in sync with the web TS copy, the
// android-seller copy, and the iOS Swift copies when adding a component.
// clients.enabled_components decides which are on for a given client.
object ComponentKeys {
    const val BUSINESS_PROFILE = "business_profile"
    const val SERVICE_PRODUCT_MENU = "service_product_menu"
    const val INQUIRY_QUOTE_FORM = "inquiry_quote_form"
    const val BOOKING_REQUEST_SYSTEM = "booking_request_system"
    const val REVIEW_REQUEST_SYSTEM = "review_request_system"
    const val CUSTOMER_DATABASE = "customer_database"
    const val QR_CODE_SETUP = "qr_code_setup"
    const val PHOTO_FILE_UPLOAD = "photo_file_upload"
    const val PAYMENTS_DEPOSITS = "payments_deposits"
    const val ADMIN_DASHBOARD = "admin_dashboard"
    const val NOTIFICATIONS = "notifications"
    const val STATUS_TRACKER = "status_tracker"
    const val PRODUCT_INVENTORY = "product_inventory"
    const val RECURRING_SCHEDULE = "recurring_schedule"
    const val LOCATION_POP_UP_TRACKER = "location_pop_up_tracker"
    const val PACKAGES_MEMBERSHIPS = "packages_memberships"
    const val LOYALTY_REWARDS_REFERRALS = "loyalty_rewards_referrals"
    const val RESOURCE_LIBRARY_FAQ = "resource_library_faq"
    const val DOCUMENT_CHECKLIST_INTAKE = "document_checklist_intake"
    const val PET_PROFILES = "pet_profiles"
    const val VEHICLE_PROFILES = "vehicle_profiles"
    const val PROPERTY_PROFILES = "property_profiles"
    const val STUDENT_PROFILES = "student_profiles"
    const val ADVANCED_ANALYTICS = "advanced_analytics"
    const val AUTOMATION_AI_WORKFLOWS = "automation_ai_workflows"
}
