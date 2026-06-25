export const LANDING = {
  brand: "Digital Resiliency Assessment",
  tagline: "A calm, structured path to understanding your posture",
  hero: {
    headline: "Measure what matters, without the busywork.",
    subhead:
      "Role-based questions organized by the services you own. Most services take 15–25 minutes; you can pause anytime. Short answers are fine—we'll ask follow-ups only when needed.",
    values: [
      { icon: "shield" as const, title: "Private & confidential", detail: "Your responses stay in your workspace." },
      { icon: "compass" as const, title: "Guided & structured", detail: "AI-assisted flow tailored to your role." },
      { icon: "leaf" as const, title: "Resume anytime", detail: "Pick up exactly where you left off." },
    ],
  },
  intro: {
    headline: "You're in the right place",
    body:
      "Whether you're starting fresh or returning to an in-progress assessment, this experience is designed to feel focused—not frantic. Take it one service at a time.",
    book: {
      title: "In Zero Trust We Trust",
      subtitle: "A Practical Guide to Adopting Zero Trust Architectures",
      author: "Avinash Naduvath",
      description:
        "This assessment is grounded in the Zero Trust principles and practical framing from the book—helping teams ask the right questions and implement the right controls.",
      href: "https://www.amazon.sg/Zero-Trust-We-Practical-Architectures/dp/0138237409",
      coverSrc: "/zero-trust-we-trust-cover.jpg",
      coverAlt: "Book cover: In Zero Trust We Trust by Avinash Naduvath",
    },
    quote:
      "Clarity comes from steady progress, not from checking every box in a single sitting.",
    quoteAttribution: "Assessment design principle",
  },
  credentials: {
    headline: "Built for practitioners who need signal, not noise",
    items: [
      { icon: "calendar" as const, title: "Service-by-service", detail: "Work through only what applies to your role." },
      { icon: "save" as const, title: "Auto-save", detail: "Chat and questionnaire drafts save automatically as you go." },
      { icon: "chart" as const, title: "Clear summary", detail: "End with an organized view of your answers." },
      { icon: "chat" as const, title: "Chat when you need it", detail: "Optional AI guidance alongside structured questions." },
    ],
  },
  testimonials: {
    headline: "Teams use it to stay aligned",
    cta: "Explore more stories",
    items: [
      {
        name: "Operations lead",
        quote:
          "We finally had a shared picture of resiliency across services—without another sprawling spreadsheet.",
        image:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
      },
      {
        name: "Security architect",
        quote:
          "The role-based defaults saved hours. I only answered what was relevant to my scope.",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      },
      {
        name: "Program manager",
        quote:
          "Auto-save meant we could pause for meetings and resume without losing momentum.",
        image:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
      },
    ],
  },
  process: {
    headline: "How it works",
    steps: [
      { title: "Sign In & Onboard", detail: "Connect your account and confirm company, role, and services." },
      { title: "Select Services", detail: "Start with role-relevant services pre-selected—you can adjust anytime." },
      { title: "Answer by Service", detail: "Focused questionnaires with auto-save after each section." },
      { title: "Review Summary", detail: "See a clear rollup and continue refining when you're ready." },
    ],
    chat: {
      title: "Assessment Assistant",
      messages: [
        { from: "bot" as const, text: "Welcome back. Ready to continue with Identity & Access?" },
        { from: "user" as const, text: "Yes—show me the next few questions." },
        { from: "bot" as const, text: "Great. I'll keep your draft saved as we go." },
      ],
    },
  },
  footer: {
    mission:
      "Purpose-built assessments for digital resiliency—structured, calm, and easy to resume.",
    company: ["About", "Privacy", "Terms"],
    support: ["Help center", "Contact", "Status"],
    quote: "Steady progress beats perfect plans.",
  },
} as const;
