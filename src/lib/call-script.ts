/**
 * Policy Bear — Inbound Final Expense agent call script (CEO approved, v1.3).
 * Each step carries the exact wording to read plus the capture fields the agent
 * fills in while reading, so reading and data entry happen in one pass.
 */

export type ScriptFieldKind = "text" | "number" | "date" | "area" | "yesno" | "choice";

export interface ScriptField {
  name: string;
  label: string;
  kind?: ScriptFieldKind;
  options?: string[];
  placeholder?: string;
  wide?: boolean;
}

export interface ScriptStep {
  id: string;
  say?: string[];
  bullets?: string[];
  note?: string;
  internal?: string;
  stop?: string;
  fields?: ScriptField[];
}

export interface ScriptPhase {
  id: string;
  title: string;
  subtitle?: string;
  steps: ScriptStep[];
}

export const SCRIPT_RULES = [
  'Policy date: always select "Check here for date on approval". Never use Save Age or a future requested policy date unless management instructs otherwise.',
  "Payment method: bank draft is the standard and must be attempted first. Direct billing is an internal exception only when bank draft is unavailable, the sale is strong, date-on-approval is selected, and the start is immediate / on approval / within one week.",
  "If the caller asks not to be contacted again, run the DNC process immediately.",
];

export const SCRIPT_INTERNAL_WHY =
  "Publishers are paid monthly. A future-dated direct bill lets a weak or fraudulent caller cancel before we have proof of payment. Bank draft gives the strongest payment control. Never read this reason to the customer.";

export const SCRIPT_PHASES: ScriptPhase[] = [
  {
    id: "p1",
    title: "1 · Opening & intent",
    subtitle: "Confirm the caller wants Final Expense before continuing.",
    steps: [
      {
        id: "p1s1",
        say: [
          "Good morning/afternoon! Thank you for calling Policy Bear. My name is [Agent Name], a licensed life insurance agent. Please note that this call may be recorded and monitored for quality assurance, training, and compliance purposes. Are you looking for life insurance for yourself or a spouse?",
        ],
        bullets: [
          "If YES: “Perfect, I’ll see what options are available for you. It only takes a few minutes.”",
          "If NO: “No problem. This line is for Final Expense life insurance, so I do not want to waste your time.” Politely end the call.",
          "If the caller asks not to be contacted again, follow the DNC process immediately.",
        ],
        fields: [
          {
            name: "lookingFor",
            label: "Coverage is for",
            kind: "choice",
            options: ["Self", "Spouse", "Both", "Someone else"],
          },
          { name: "agentName", label: "Agent on the call" },
        ],
      },
      {
        id: "p1s2",
        say: ["Great. Approximately how much coverage are you looking for today?"],
        note: "Record the requested coverage amount before moving forward.",
        fields: [
          { name: "coverageRequested", label: "Requested coverage ($)", kind: "number" },
        ],
      },
    ],
  },
  {
    id: "p2",
    title: "2 · Pre-screening & readiness",
    subtitle: "Protect paid call cost, confirm fit, check if they can complete today.",
    steps: [
      {
        id: "p2s1",
        say: [
          "Quick question before I pull any numbers — are you currently in a hospital, nursing home, or using oxygen at home?",
        ],
        bullets: [
          "If NO: continue.",
          "If YES: “Unfortunately, based on your current health situation, the plans I represent would not be the best fit today.” Politely end the call.",
        ],
        fields: [{ name: "hospitalOxygen", label: "Hospital / nursing home / oxygen", kind: "yesno" }],
      },
      {
        id: "p2s2",
        say: [
          "Have you been diagnosed with congestive heart failure, Alzheimer’s, ALS, liver failure, or a terminal illness?",
        ],
        bullets: ["If YES: use the professional not-a-fit ending and close the call."],
        fields: [{ name: "terminalDiagnosis", label: "CHF / Alzheimer’s / ALS / liver / terminal", kind: "yesno" }],
      },
      {
        id: "p2s3",
        say: ["Have you ever been diagnosed with AIDS or HIV positive?"],
        bullets: [
          "If NO: “Based on what you’ve shared so far, it looks like you may qualify for one of our plans.”",
          "If YES: use the professional not-a-fit ending and close the call.",
        ],
        fields: [{ name: "hivAids", label: "AIDS / HIV positive", kind: "yesno" }],
      },
      {
        id: "p2s4",
        stop: "STOP — early payment readiness check. Bank draft must be attempted first. Continue without bank details only for a strong sale that starts immediately / on approval / within one week with date-on-approval selected. Otherwise set a callback to collect bank draft details.",
        say: [
          "Before I prepare your quote, I just want to make sure we’re able to complete everything today if you like what I find.",
          "Do you have access to your checking account information today? That would be your routing number and account number.",
        ],
        bullets: [
          "If NO: “That’s okay. Let me first check what you qualify for and what the start-date option looks like. If we can set this up to start right away/on approval, I’ll explain the payment option clearly before we submit anything.”",
        ],
        fields: [
          { name: "bankAccessToday", label: "Bank details available today", kind: "yesno" },
          {
            name: "readinessOutcome",
            label: "Readiness outcome",
            kind: "choice",
            options: ["Can complete today", "Needs callback for bank draft", "Not a fit"],
          },
        ],
      },
      {
        id: "p2s5",
        say: [
          "And if everything looks good today, are you comfortable providing your Social Security Number if the carrier requires it for the application?",
        ],
        bullets: [
          "If hesitant: “I understand. The carrier may require it to verify identity and process the application securely. We will only enter it in the approved application system.”",
        ],
        fields: [{ name: "ssnComfortable", label: "Comfortable providing SSN", kind: "yesno" }],
      },
    ],
  },
  {
    id: "p3",
    title: "3 · Personal information",
    subtitle: "Collect quickly and keep it conversational.",
    steps: [
      {
        id: "p3s1",
        say: ["Can I get your full legal name?", "Date of birth?", "Male or female?"],
        note: "Insurable age = age at last birthday.",
        fields: [
          { name: "fullName", label: "Full legal name" },
          { name: "dob", label: "Date of birth", kind: "date" },
          { name: "gender", label: "Gender", kind: "choice", options: ["Male", "Female"] },
        ],
      },
      {
        id: "p3s2",
        say: [
          "In the last 12 months, have you used any tobacco? That includes cigarettes, vaping, or chewing tobacco.",
        ],
        note: "Tobacco use affects the rate.",
        fields: [{ name: "tobacco12mo", label: "Tobacco in last 12 months", kind: "yesno" }],
      },
      {
        id: "p3s3",
        say: [
          "Should the policy go directly to you, or to someone else?",
          "We can set you up with a digital policy so you can access it online, make payments, and receive updates. Would you like to go digital?",
        ],
        fields: [
          {
            name: "policyRecipient",
            label: "Policy delivery to",
            kind: "choice",
            options: ["Insured", "Owner", "Agent"],
          },
          { name: "digitalPolicy", label: "Digital policy", kind: "yesno" },
        ],
      },
    ],
  },
  {
    id: "p4",
    title: "4 · Pull quote & check in",
    subtitle: "Do not move to deeper health questions until the customer agrees with the direction.",
    steps: [
      {
        id: "p4s1",
        say: ["Alright, one second while I pull that up."],
        note: "Pull the quote from age, gender, tobacco, coverage amount and available plan type.",
      },
      {
        id: "p4s2",
        say: [
          "Okay — for $[amount] in coverage, you are looking at $[premium] per [month/quarter/year] on a [Immediate/Graded/ROP] option. This is still subject to the full application and carrier review. How does that sound?",
        ],
        bullets: [
          "Happy: “Great — just a few more quick health questions and we are almost done.”",
          "Wants less/more coverage: adjust, repull, check in again.",
          "Asks about frequency: “We can review available options, but our standard setup is bank draft because it helps the policy process properly.”",
        ],
        fields: [
          { name: "quotedCoverage", label: "Quoted coverage ($)", kind: "number" },
          { name: "quotedPremium", label: "Quoted premium ($)", kind: "number" },
          {
            name: "premiumFrequency",
            label: "Frequency",
            kind: "choice",
            options: ["Monthly", "Quarterly", "Annual"],
          },
          {
            name: "planTypePrelim",
            label: "Preliminary plan type",
            kind: "choice",
            options: ["Immediate", "Graded", "ROP"],
          },
          {
            name: "quoteReaction",
            label: "Customer reaction",
            kind: "choice",
            options: ["Accepted", "Wants lower premium", "Wants more coverage", "Thinking about it"],
          },
        ],
      },
    ],
  },
  {
    id: "p5",
    title: "5 · Health questions",
    subtitle: "Determines plan type: Immediate / Graded / ROP.",
    steps: [
      {
        id: "p5s0",
        say: ["Just a few more quick health questions to make sure I put you on the right plan."],
      },
      {
        id: "p5s1",
        say: [
          "Any diabetes complications — kidney damage, eye damage, nerve damage, insulin shock, or insulin use before age 50?",
        ],
        note: "YES → likely Graded or ROP.",
        fields: [{ name: "q4Diabetes", label: "Q4 · Diabetes complications", kind: "yesno" }],
      },
      {
        id: "p5s2",
        say: ["Have you been diagnosed with kidney disease, or had cancer more than once?"],
        note: "YES → review plan type.",
        fields: [{ name: "q5KidneyCancer", label: "Q5 · Kidney disease / repeat cancer", kind: "yesno" }],
      },
      {
        id: "p5s3",
        say: [
          "In the past 2 years, have you had any recommended tests, surgeries, hospital stays not completed yet, or results still pending?",
        ],
        note: "YES → may affect immediate benefit.",
        fields: [{ name: "q6Pending", label: "Q6 · Pending tests / surgery", kind: "yesno" }],
      },
      {
        id: "p5s4",
        say: [
          "In the past 2 years, have you had chest pain, stroke, heart attack, COPD, emphysema, Hepatitis C, cirrhosis, lupus, a pacemaker, or heart surgery?",
        ],
        fields: [{ name: "q7Past2Years", label: "Q7 · Cardiac / respiratory / liver history", kind: "yesno" }],
      },
      {
        id: "p5s5",
        say: ["Paralysis in two or more limbs, MS, Parkinson’s, seizures, or muscular dystrophy?"],
        fields: [{ name: "q8Neuro", label: "Q8 · Neurological conditions", kind: "yesno" }],
      },
      {
        id: "p5s6",
        say: [
          "Any ongoing COVID-19 complications in the past 6 months, or are you currently being treated for it?",
        ],
        note: "All NO on Q4–Q8 may fit Immediate Benefit. YES on Q7/Q8 may point to Graded. YES on Q4/Q5 may require ROP review. Always follow the carrier result.",
        fields: [
          { name: "covidComplications", label: "COVID complications", kind: "yesno" },
          { name: "healthNotes", label: "Health / medication notes", kind: "area", wide: true },
        ],
      },
    ],
  },
  {
    id: "p6",
    title: "6 · Plan details & policy options",
    subtitle: "Confirm the plan and remind them the carrier still reviews the application.",
    steps: [
      {
        id: "p6s1",
        say: [
          "Based on what you shared, the option I am seeing is a [Immediate / Graded / ROP] final expense plan. Coverage is $[amount], and the premium is $[premium] per [month/quarter/year].",
          "The application still has to be submitted and reviewed by the carrier, but this is the option that appears to fit best based on what you told me.",
        ],
        fields: [
          {
            name: "policyType",
            label: "Final plan type",
            kind: "choice",
            options: ["Immediate", "Graded", "ROP"],
          },
          { name: "carrier", label: "Carrier" },
          { name: "faceAmount", label: "Coverage amount ($)", kind: "number" },
          { name: "premium", label: "Monthly premium ($)", kind: "number" },
        ],
      },
    ],
  },
  {
    id: "p7",
    title: "7 · Address & contact",
    subtitle: "Start easy — save SSN until the application flow.",
    steps: [
      {
        id: "p7s1",
        say: [
          "Perfect — I just need to get a few more quick details, and then we are all set to complete the application.",
          "What is your home address — starting with the street?",
          "And the zip code?",
        ],
        note: "Zip auto-fills city/state — confirm both out loud.",
        fields: [
          { name: "street", label: "Street address", wide: true },
          { name: "zip", label: "Zip" },
          { name: "city", label: "City" },
          { name: "state", label: "State" },
        ],
      },
      {
        id: "p7s2",
        say: [
          "What is the best phone number to reach you at?",
          "Would you like to add an email address to your file so we can send you updates and policy documents digitally?",
        ],
        fields: [
          { name: "altPhone", label: "Best contact phone" },
          { name: "email", label: "Email" },
        ],
      },
    ],
  },
  {
    id: "p8",
    title: "8 · SSN, physical details & birthplace",
    subtitle: "Routine and matter-of-fact. Sensitive data goes only in the approved application system.",
    steps: [
      {
        id: "p8s1",
        say: [
          "Now I have a couple of standard items — totally routine, and we just need them for the application.",
          "Can I get your Social Security number when you are ready?",
        ],
        internal:
          "Never type a full SSN, full account number or routing number into the CRM. Mark it collected in the carrier system only.",
        fields: [
          { name: "ssnCollected", label: "SSN entered in carrier system", kind: "yesno" },
        ],
      },
      {
        id: "p8s2",
        say: [
          "And just for the health profile, roughly what is your height and weight?",
          "Last one in this section — what state or country were you born in?",
        ],
        fields: [
          { name: "height", label: "Height" },
          { name: "weight", label: "Weight (lbs)", kind: "number" },
          { name: "birthPlace", label: "State / country of birth" },
        ],
      },
    ],
  },
  {
    id: "p9",
    title: "9 · Physician information",
    subtitle: "Quick and optional — no pressure if they do not have it handy.",
    steps: [
      {
        id: "p9s1",
        say: ["Do you have a primary care doctor you see regularly?", "What is their name?"],
        bullets: ["If NO: “No problem at all.” Move on."],
        fields: [
          { name: "hasPhysician", label: "Has primary physician", kind: "yesno" },
          { name: "physicianName", label: "Physician name" },
          { name: "physicianCity", label: "Physician city / clinic" },
        ],
      },
    ],
  },
  {
    id: "p10",
    title: "10 · Payment setup",
    subtitle: "Bank draft first. Direct billing only under the internal exception.",
    steps: [
      {
        id: "p10s0",
        internal:
          'Default is bank draft. Direct billing is allowed ONLY when bank draft is unavailable, the sale is strong, the customer wants immediate / on-approval / ASAP start, the start date is within one week, and "Check here for date on approval" is selected. Never long future direct-bill dates. Card/other only if the carrier and management allow it.',
        say: [
          "Okay, great — we are almost done. The final step is setting up the payment so the application can be submitted properly.",
          "Our standard process is bank draft, so I will need a couple of quick details from your bank account.",
        ],
        fields: [
          {
            name: "paymentMethod",
            label: "Payment method",
            kind: "choice",
            options: ["Bank draft", "Direct billing (exception)", "Card / other (approved)"],
          },
          { name: "directBillReason", label: "If direct billing — reason & approval", wide: true },
        ],
      },
      {
        id: "p10s1",
        say: [
          "Whose name is on the bank account?",
          "And which bank do you use?",
          "City and state where the bank is based?",
          "Is the account a checking or savings account?",
        ],
        fields: [
          { name: "accountHolder", label: "Account holder name" },
          { name: "bankName", label: "Bank name" },
          { name: "bankCityState", label: "Bank city / state" },
          {
            name: "accountType",
            label: "Account type",
            kind: "choice",
            options: ["Checking", "Savings"],
          },
        ],
      },
      {
        id: "p10s2",
        say: [
          "I need the routing number — that is the 9-digit number on the far left at the bottom of one of your checks. Take your time.",
          "And the account number, which is right next to that one.",
        ],
        internal: "Enter routing and account numbers in the carrier application only — never in the CRM.",
        fields: [
          { name: "routingEntered", label: "Routing number entered in carrier", kind: "yesno" },
          { name: "accountEntered", label: "Account number entered in carrier", kind: "yesno" },
          { name: "draftDate", label: "Draft date", kind: "date" },
        ],
      },
    ],
  },
  {
    id: "p11",
    title: "11 · Owner & payor",
    steps: [
      {
        id: "p11s1",
        say: [
          "Will you be the owner of this policy?",
          "And the payments — will those be coming from you as well?",
        ],
        bullets: [
          "If not the owner: collect the owner’s full name and relationship.",
          "If not the payor: collect the payor’s full name and contact information, then follow application requirements.",
        ],
        fields: [
          { name: "ownerIsInsured", label: "Insured is the owner", kind: "yesno" },
          { name: "ownerName", label: "Owner name & relationship" },
          { name: "payorName", label: "Payor name & contact" },
        ],
      },
    ],
  },
  {
    id: "p12",
    title: "12 · Beneficiary",
    subtitle: "Slow down slightly — this matters to people.",
    steps: [
      {
        id: "p12s1",
        say: [
          "Now the most important part — who would you like to name as your beneficiary? That is the person who would receive the benefit.",
          "Can I get their full name?",
          "And their Social Security number?",
          "Date of birth?",
          "What is their relationship to you?",
          "Is there anyone else you would like to add as a beneficiary, or just this one person?",
        ],
        note: "If the beneficiary SSN is unavailable: “That is okay, we can note it as best available.” If multiple beneficiaries, collect the same details for each.",
        fields: [
          { name: "beneficiary", label: "Primary beneficiary name" },
          { name: "beneficiaryDob", label: "Beneficiary DOB", kind: "date" },
          {
            name: "beneficiaryRelationship",
            label: "Relationship",
            kind: "choice",
            options: ["Spouse", "Parent", "Child", "Life partner", "Fiancé(e)", "Estate", "Trust", "Other"],
          },
          { name: "contingentBeneficiary", label: "Additional / contingent beneficiary", wide: true },
        ],
      },
    ],
  },
  {
    id: "p13",
    title: "13 · Policy date & compliance",
    subtitle: "The date rule is absolute.",
    steps: [
      {
        id: "p13s1",
        internal:
          'On the quote/application screen always select "Check here for date on approval". Never Save Age or a future requested policy date unless management instructs otherwise.',
        say: [
          "Your coverage would start on approval, so there is no waiting on a future start date.",
          "Just to confirm, you understand and agree that this call is recorded for quality assurance and compliance purposes.",
        ],
        note: "Pause for clear confirmation before continuing.",
        fields: [
          { name: "policyDateOnApproval", label: '"Date on approval" selected', kind: "yesno" },
          { name: "recordingConfirmed", label: "Recording disclosure confirmed", kind: "yesno" },
        ],
      },
    ],
  },
  {
    id: "p14",
    title: "14 · Submission & wrap-up",
    steps: [
      {
        id: "p14s1",
        say: [
          "Perfect. I am wrapping up the application now before we proceed with the e-signature/verification.",
          "Thank you for choosing Policy Bear. Once everything is processed, your documents/status will be provided according to the carrier’s timeline. If you need anything, you can call us back anytime.",
        ],
        bullets: [
          "Complete the agent report: agent name, city signed, state signed, required remarks.",
          "Complete e-signature or verification per the carrier workflow.",
          'Do not promise approval — use "submitted", "pending review", "conditionally approved" or "approved" only when the portal supports it.',
        ],
        fields: [
          {
            name: "policyStatus",
            label: "Application status",
            kind: "choice",
            options: ["Submitted", "Pending review", "Conditionally approved", "Approved", "Declined"],
          },
          { name: "applicationNumber", label: "Application number" },
          { name: "citySigned", label: "City signed" },
          { name: "stateSigned", label: "State signed" },
          { name: "policyDelivery", label: "Policy delivery date", kind: "date" },
          { name: "agentRemarks", label: "Agent remarks", kind: "area", wide: true },
        ],
      },
    ],
  },
  {
    id: "p15",
    title: "15 · CRM notes & data handling",
    subtitle: "Customer does not hear this section — after-call work.",
    steps: [
      {
        id: "p15s1",
        internal:
          "DO write: interest in FE, coverage amount, premium, product type, carrier/application status, callback time, payment method category only. DO NOT write: full SSN, full account or routing number, card numbers, private health detail beyond what is needed, screenshots or sensitive documents.",
        fields: [
          { name: "agentNotes", label: "Agent notes for the CRM", kind: "area", wide: true },
          { name: "doNotContact", label: "Do not contact requested", kind: "yesno" },
          { name: "source", label: "Lead source / publisher" },
        ],
      },
    ],
  },
];

export const SCRIPT_FIELD_COUNT = SCRIPT_PHASES.reduce(
  (n, p) => n + p.steps.reduce((m, s) => m + (s.fields?.length ?? 0), 0),
  0,
);
