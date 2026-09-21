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
    badge: "For Solo Devs",
    price: 499,
    originalPrice: 999,
    currency: "INR",
    currencySymbol: "₹",
    billingPeriod: "monthly",
    billingPeriodLabel: "/month",
    description: "Essential CrackFlow desktop features for individual developers & security enthusiasts.",
    features: [
      { text: "Full Desktop App Access", included: true },
      { text: "Up to 5 Concurrent Projects", included: true },
      { text: "Standard Decompilation Engines", included: true },
      { text: "Community Support", included: true },
      { text: "Cloud Decompiler Workers", included: false },
      { text: "Priority Support & Updates", included: false },
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
    description: "Advanced reverse engineering suite for professionals and security teams.",
    features: [
      { text: "Full Desktop App Access", included: true },
      { text: "Unlimited Concurrent Projects", included: true },
      { text: "All Decompilation Engines", included: true },
      { text: "Cloud Decompiler Acceleration", included: true },
      { text: "Priority Support & Fast Updates", included: true },
      { text: "Team License Sharing", included: false },
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
    description: "Pay once, access CrackFlow desktop forever with all future major updates included.",
    features: [
      { text: "Full Desktop App Access Forever", included: true },
      { text: "Unlimited Projects & Features", included: true },
      { text: "All Decompilation Engines", included: true },
      { text: "Cloud Decompiler Acceleration", included: true },
      { text: "Lifetime Updates & Support", included: true },
      { text: "V.I.P Discord Channel", included: true },
    ],
    buttonText: "Get Lifetime Access",
    buttonVariant: "default",
  },
];

export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}
