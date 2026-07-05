-- Toll-free number provisioning + Twilio Toll-Free Verification tracking.
-- A subaccount can now exist before a number is purchased, so phone_number
-- is no longer required at insert time.

alter table twilio_subaccounts
  alter column phone_number drop not null,
  add column phone_number_sid text,
  add column toll_free_verification_sid text,
  add column verification_status text not null default 'not_started'
    check (verification_status in ('not_started', 'pending_review', 'in_review', 'approved', 'rejected')),
  add column verification_submitted_at timestamptz,
  add column verification_updated_at timestamptz,
  add column verification_detail jsonb;
