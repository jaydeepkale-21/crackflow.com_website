export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  id: "starter" | "pro" | "lifetime";
  name: string;
  badge?: string;
  popular?: boolean;
  price: number;
  originalPrice?: number;
  currency: string;
  currencySymbol: string;
  billingPeriod: "monthly" | "one_time";
  billingPeriodLabel: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  buttonVariant: "default" | "gold" | "outline";
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "Essential",
    price: 499,
    originalPrice: 999,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "monthly",
    billingPeriodLabel: "/month",
    description: "Essential CrackFlow desktop AI interview assistant for individual job seekers.",
    features: [
      { text: "Full Windows Desktop App Access", included: true },
      { text: "Real-time Speech-to-Text Transcription", included: true },
      { text: "AI-Powered Live Answer Suggestions", included: true },
      { text: "Private Desktop Overlay (Screen-share Safe)", included: true },
      { text: "Standard Context Loading (Resume & JD)", included: true },
      { text: "Advanced Coding Mode & OCR", included: false },
      { text: "Priority Cloud AI Processing", included: false },
    ],
    buttonText: "Get Starter",
    buttonVariant: "outline",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most Popular",
    popular: true,
    price: 999,
    originalPrice: 1999,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "monthly",
    billingPeriodLabel: "/month",
    description: "Full-power AI interview copilot with code generation, OCR, and ultra-low latency.",
    features: [
      { text: "Full Windows Desktop App Access", included: true },
      { text: "Real-time Speech-to-Text Transcription", included: true },
      { text: "Ultra-low Latency AI Completions", included: true },
      { text: "Coding Mode (DSA, System Design, LeetCode)", included: true },
      { text: "On-demand Screen OCR & Visual Analysis", included: true },
      { text: "Unlimited Resume & Job Context Files", included: true },
      { text: "Priority Support & Regular Updates", included: true },
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "gold",
  },
  {
    id: "lifetime",
    name: "Lifetime Pass",
    badge: "Best Value",
    price: 4999,
    originalPrice: 9999,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "one_time",
    billingPeriodLabel: "one-time payment",
    description: "Pay once for lifetime access to CrackFlow desktop service with no recurring subscription fees.",
    features: [
      { text: "All Pro Features Included", included: true },
      { text: "No Recurring Monthly Fees", included: true },
      { text: "Full Windows Desktop App Access", included: true },
      { text: "Speech-to-Text & AI Generation", included: true },
      { text: "Coding & Behavioral Interview Modes", included: true },
      { text: "Lifetime Updates for Current Service", included: true },
      { text: "Priority Customer Support", included: true },
    ],
    buttonText: "Get Lifetime Access",
    buttonVariant: "default",
  },
];

export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}
