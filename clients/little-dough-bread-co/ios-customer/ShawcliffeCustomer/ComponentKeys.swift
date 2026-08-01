import Foundation

// Shared component-key registry (Tier 0 gating). Hand-duplicated from
// platform/web/src/lib/components.ts. Keep in sync with the web TS copy, the
// ios-seller copy, and the Android Kotlin copies when adding a component.
// clients.enabled_components decides which are on for a given client.
enum ComponentKeys {
    static let businessProfile        = "business_profile"
    static let serviceProductMenu     = "service_product_menu"
    static let inquiryQuoteForm       = "inquiry_quote_form"
    static let bookingRequestSystem   = "booking_request_system"
    static let reviewRequestSystem    = "review_request_system"
    static let customerDatabase       = "customer_database"
    static let qrCodeSetup            = "qr_code_setup"
    static let photoFileUpload        = "photo_file_upload"
    static let paymentsDeposits       = "payments_deposits"
    static let adminDashboard         = "admin_dashboard"
    static let notifications          = "notifications"
    static let statusTracker          = "status_tracker"
    static let productInventory       = "product_inventory"
    static let recurringSchedule      = "recurring_schedule"
    static let locationPopUpTracker   = "location_pop_up_tracker"
    static let packagesMemberships    = "packages_memberships"
    static let loyaltyRewardsReferrals = "loyalty_rewards_referrals"
    static let resourceLibraryFaq     = "resource_library_faq"
    static let documentChecklistIntake = "document_checklist_intake"
    static let petProfiles            = "pet_profiles"
    static let vehicleProfiles        = "vehicle_profiles"
    static let propertyProfiles       = "property_profiles"
    static let studentProfiles        = "student_profiles"
    static let advancedAnalytics      = "advanced_analytics"
    static let automationAiWorkflows  = "automation_ai_workflows"
}
