import type { Profile, BankingStatus } from '@/types/database';

export interface OnboardingStatus {
  complete: boolean;
  missingSteps: {
    companyInfo: boolean;
    bankingInfo: boolean;
  };
  bankingStatus: BankingStatus;
}

export function getProviderOnboardingStatus(profile: Profile): OnboardingStatus {
  const companyInfo = !profile.company_name || !profile.bio;
  const bankingInfo = !profile.rfc || !profile.clabe || !profile.bank_document_url;

  return {
    complete: !companyInfo && !bankingInfo,
    missingSteps: {
      companyInfo,
      bankingInfo,
    },
    bankingStatus: profile.banking_status,
  };
}
