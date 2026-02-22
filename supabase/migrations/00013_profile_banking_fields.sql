-- Migration: Add banking/billing fields to profiles for client RFC and provider CLABE/banking verification
-- These fields support the profile system (client billing info + provider banking verification)

-- Client billing field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rfc TEXT;

-- Provider banking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clabe TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_document_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banking_status TEXT DEFAULT 'not_submitted'
  CHECK (banking_status IN ('not_submitted', 'pending_review', 'verified', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banking_rejection_reason TEXT;
