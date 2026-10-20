export interface PlanFeature {
  text: string;
  included: boolean;
}

export type PlanId =
  | "INTERVIEW_1H"
  | "INTERVIEW_6H"
  | "INTERVIEW_24H"
  | "MONTHLY"
  | "YEARLY"
  | "starter"
  | "pro"
  | "lifetime";

export interface Plan {
  id: PlanId;
  name: string;
  badge?: string;
  popular?: boolean;
  price: number;
  originalPrice?: number;
  currency: string;
  currencySymbol: string;
  billingPeriod: "one_time" | "monthly" | "yearly";
  billingPeriodLabel: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  buttonVariant: "default" | "gold" | "outline";
}

export const PLANS: Plan[] = [
  {
    id: "INTERVIEW_1H",
    name: "1 Hour",
    badge: "Quick Prep",
    price: 199,
    originalPrice: 499,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "one_time",
    billingPeriodLabel: "valid 30 days",
    description: "1 hour of actual live AI interview assistance.",
    features: [
      { text: "1 Hour of Live Interview Time", included: true },
      { text: "234 AI Screen Solves Included", included: true },
      { text: "Full Windows Desktop App Access", included: true },
      { text: "Real-time Speech-to-Text Transcription", included: true },
      { text: "AI-Powered Live Answer Suggestions", included: true },
      { text: "Private Desktop Overlay (Screen-share Safe)", included: true },
      { text: "30-Day Calendar Usage Window", included: true },
    ],
    buttonText: "Get 1 Hour",
    buttonVariant: "outline",
  },
  {
    id: "INTERVIEW_6H",
    name: "6 Hours",
    badge: "Most Popular",
    popular: true,
    price: 499,
    originalPrice: 999,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "one_time",
    billingPeriodLabel: "valid 90 days",
    description: "360 minutes of live interview usage for multiple rounds and assessments.",
    features: [
      { text: "360 Minutes of Live Interview Time", included: true },
      { text: "587 AI Screen Solves Included", included: true },
      { text: "Full Windows Desktop App Access", included: true },
      { text: "Ultra-low Latency Speech & AI", included: true },
      { text: "Coding & System Design Modes", included: true },
      { text: "Private Desktop Overlay (Screen-share Safe)", included: true },
      { text: "90-Day Calendar Usage Window", included: true },
    ],
    buttonText: "Get 6 Hours",
    buttonVariant: "gold",
  },
  {
    id: "INTERVIEW_24H",
    name: "24 Hours / Whole Day",
    badge: "Best Value",
    price: 999,
    originalPrice: 2499,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "one_time",
    billingPeriodLabel: "valid 180 days",
    description: "24 full hours (1,440 minutes) of actual interview usage across 180 days.",
    features: [
      { text: "24 Full Hours of Actual Usage", included: true },
      { text: "1,175 AI Screen Solves Included", included: true },
      { text: "Use across multiple weeks / months", included: true },
      { text: "Full Windows Desktop App Access", included: true },
      { text: "All Interview Modes (DSA, System Design, HR)", included: true },
      { text: "Ultra-low Latency Cloud AI", included: true },
      { text: "180-Day Calendar Usage Window", included: true },
    ],
    buttonText: "Get 24 Hours",
    buttonVariant: "default",
  },
  {
    id: "MONTHLY",
    name: "Monthly",
    badge: "Unlimited",
    price: 999,
    originalPrice: 1999,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "monthly",
    billingPeriodLabel: "/month",
    description: "Unlimited interview usage for active job hunting season.",
    features: [
      { text: "Unlimited Interview Usage", included: true },
      { text: "Unlimited AI Screen Solves (Fair Use applies)", included: true },
      { text: "Full Windows Desktop App Access", included: true },
      { text: "Ultra-low Latency AI Answers", included: true },
      { text: "Continuous Regular Updates", included: true },
      { text: "Priority Support & Low Latency Cloud", included: true },
    ],
    buttonText: "Get Unlimited Monthly",
    buttonVariant: "outline",
  },
  {
    id: "YEARLY",
    name: "Yearly Pass",
    badge: "Unlimited",
    price: 4999,
    originalPrice: 9999,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "yearly",
    billingPeriodLabel: "/year",
    description: "Unlimited annual access with maximum savings for senior career switches.",
    features: [
      { text: "Unlimited Interview Usage for 1 Year", included: true },
      { text: "Unlimited AI Screen Solves (Fair Use applies)", included: true },
      { text: "Full Windows Desktop App Access", included: true },
      { text: "All Interview Modes & Updates", included: true },
      { text: "Ultra-low Latency Cloud Priority", included: true },
      { text: "Priority 24/7 Support", included: true },
    ],
    buttonText: "Get Unlimited Yearly",
    buttonVariant: "default",
  },
];

// Aliases for backward compatibility
const ALIASES: Record<string, string> = {
  starter: "INTERVIEW_1H",
  pro: "MONTHLY",
  lifetime: "YEARLY",
};

export function getPlanById(planId: string): Plan | undefined {
  const direct = PLANS.find((p) => p.id === planId);
  if (direct) return direct;
  const aliasedId = ALIASES[planId];
  if (aliasedId) return PLANS.find((p) => p.id === aliasedId);
  return undefined;
}

