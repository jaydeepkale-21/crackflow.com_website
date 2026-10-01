/**
 * CrackFlow Business & Operator Configuration
 * 
 * Centralized business identity, support contact details, and policy configuration.
 */

export interface BusinessConfig {
  productName: string;
  websiteUrl: string;
  legalBusinessName: string;
  isLegalBusinessNameConfigured: boolean;
  registeredAddress: string;
  isRegisteredAddressConfigured: boolean;
  supportEmail: string;
  contactPhone: string;
  isContactPhoneConfigured: boolean;
  supportResponseTime: string;
  refundWindow: string;
  paymentProviderName: string;
  copyrightYear: number;
}

export const BUSINESS_CONFIG: BusinessConfig = {
  productName: "CrackFlow",
  websiteUrl: "https://crackflow.com",

  // Legal Operator Information
  legalBusinessName: "crackflow.com",
  isLegalBusinessNameConfigured: true,

  registeredAddress: "Khadki, Pune, Maharashtra, India - 413130",
  isRegisteredAddressConfigured: true,

  // Customer Support Information
  supportEmail: "support@crackflow.com",
  contactPhone: "+91 9699614146",
  isContactPhoneConfigured: true,

  supportResponseTime: "Within 24 to 48 business hours",

  // Business Policy Configuration
  refundWindow: "7 days",

  paymentProviderName: "Razorpay",
  copyrightYear: 2026,
};
