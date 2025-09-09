// pricingData.ts
const PRICING_PLANS = [
  {
    name: "Free",
    price: 0,
    period: "month",
    features: [
      "20 AI-assisted queries per month",
      "Basic analytics insights",
      "Community support",
      "Limited file upload (2MB max)",
    ],
    isPopular: false,
    queryLimit: 20,
  },
  {
    name: "Basic",
    price: 29,
    period: "month",
    features: [
      "100 AI-assisted queries per month",
      "Access to personalized investment reports",
      "Standard support",
      "File upload up to 10MB",
    ],
    isPopular: false,
    queryLimit: 100,
  },
  {
    name: "Pro",
    price: 79,
    period: "month",
    features: [
      "Unlimited AI-assisted queries",
      "Priority access to advanced features",
      "Priority support",
      "Unlimited file upload",
      "Advanced analytics & insights",
    ],
    isPopular: true,
    queryLimit: -1, // Unlimited
  },
  {
    name: "Expert Sessions",
    price: 150,
    period: "hour",
    features: [
      "One-on-one consultation with industry experts",
      "Tailored portfolio reviews",
      "In-depth market strategy guidance",
    ],
    isPopular: false,
    queryLimit: -1, // No query limit for expert sessions
  },
];
export default PRICING_PLANS;
