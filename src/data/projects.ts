export type ProjectCategory =
  | "All samples"
  | "Administration"
  | "Operations"
  | "Data & research"
  | "Content";

export type Project = {
  id: string;
  title: string;
  category: Exclude<ProjectCategory, "All samples">;
  description: string;
  evidence: string;
  tools: string[];
  color: "peach" | "sage" | "lavender" | "sand" | "blue" | "rose";
  preview:
    | "inbox"
    | "calendar"
    | "onboarding"
    | "crm"
    | "social"
    | "meeting"
    | "spreadsheet"
    | "research"
    | "files"
    | "support"
    | "records";
  brief: string;
  approach: string[];
  deliverables: string[];
  artifact: { label: string; href: string };
  supportingArtifact?: { label: string; href: string };
};

export const projects: Project[] = [
  {
    id: "records-intake-qa",
    title: "Records Intake & Quality Check",
    category: "Administration",
    description:
      "Fifteen fictional records requests logged with authorization, source, date-range, completeness, QA, exception, and release-status fields.",
    evidence: "15-record QA log",
    tools: ["Microsoft Excel", "Microsoft Word", "Document management"],
    color: "blue",
    preview: "records",
    brief:
      "Build a privacy-aware practice workflow for a fictional records team receiving sensitive-document requests from several source systems. The sample uses synthetic IDs only and contains no real personal, patient, or medical information.",
    approach: [
      "Define the required intake fields, status labels, and authorization checkpoints before entering records.",
      "Use synthetic identifiers, record only the information needed for the task, and place incomplete requests on hold instead of guessing.",
      "Check record range, document count, completeness, and release status; log each exception with an owner and next action.",
    ],
    deliverables: [
      "Fifteen-row fictional records request log",
      "Authorization, completeness, and quality-control fields",
      "Exception handling and customer-update workflow",
    ],
    artifact: {
      label: "Download records QA log",
      href: "/projects/records-intake-quality-log.csv",
    },
    supportingArtifact: {
      label: "Download workflow guide",
      href: "/projects/records-coordination-workflow.md",
    },
  },
  {
    id: "client-onboarding",
    title: "Client Onboarding Workflow",
    category: "Operations",
    description:
      "An eight-step onboarding process with a welcome email, kickoff agenda, folder structure, and handoff checks.",
    evidence: "8-step workflow",
    tools: ["Notion", "Google Drive", "Google Forms"],
    color: "sage",
    preview: "onboarding",
    brief:
      "Turn a fictional creative studio's new-client handoff into a checklist that can be reused without losing the personal touch.",
    approach: [
      "Map the handoff from signed agreement to the first working session.",
      "Assign an owner, trigger, and completion check to every step.",
      "Draft a welcome message and a focused kickoff agenda.",
    ],
    deliverables: [
      "Onboarding checklist",
      "Welcome email template",
      "Kickoff agenda and folder structure",
    ],
    artifact: {
      label: "Download onboarding kit",
      href: "/projects/client-onboarding-kit.md",
    },
  },
  {
    id: "lead-pipeline",
    title: "Lead Research & CRM Tracker",
    category: "Data & research",
    description:
      "Eight fictional lead records organized by fit, status, owner, next action, and review date.",
    evidence: "8 sample records",
    tools: ["Google Sheets", "HubSpot", "Notion"],
    color: "sand",
    preview: "crm",
    brief:
      "Create a tidy practice lead tracker for a fictional service business, with consistent stages and enough context for a useful handoff.",
    approach: [
      "Choose fields that explain fit, ownership, stage, and next steps.",
      "Use fictional companies and reserved example domains throughout.",
      "Add clear qualification notes and a follow-up task for each record.",
    ],
    deliverables: [
      "Eight fictional lead records",
      "Qualification and stage fields",
      "Owner and follow-up tracking",
    ],
    artifact: {
      label: "Download sample CRM",
      href: "/projects/sample-lead-pipeline.csv",
    },
  },
  {
    id: "inbox-reset",
    title: "Inbox Management Playbook",
    category: "Administration",
    description:
      "A six-label inbox system with follow-up tracking, daily reviews, and a weekly cleanup routine.",
    evidence: "6-label system",
    tools: ["Gmail", "Google Sheets", "Google Calendar"],
    color: "peach",
    preview: "inbox",
    brief:
      "Design a repeatable inbox routine for a fictional independent consultant who needs a clear view of what to answer, delegate, and revisit.",
    approach: [
      "Define a small set of labels and practical rules for triaging new messages.",
      "Pair each waiting item with an owner and a follow-up date.",
      "Create a short daily review and a weekly cleanup checklist.",
    ],
    deliverables: [
      "Inbox label map",
      "Follow-up tracker example",
      "Daily and weekly checklists",
    ],
    artifact: {
      label: "Download inbox playbook",
      href: "/projects/inbox-playbook.md",
    },
  },
  {
    id: "product-data-cleanup",
    title: "Product Data Cleanup & QA",
    category: "Data & research",
    description:
      "Twelve fictional catalog records standardized across SKUs, product names, categories, prices, stock, and review status.",
    evidence: "12 cleaned records",
    tools: ["Google Sheets", "Microsoft Excel", "Shopify"],
    color: "blue",
    preview: "spreadsheet",
    brief:
      "Turn a deliberately inconsistent sample product export into a clean catalog that a fictional home-goods shop could review before import.",
    approach: [
      "Define one schema and validation rule for every catalog field.",
      "Normalize names, categories, prices, stock values, and SKU formatting without inventing missing source details.",
      "Add issue, action, and review-status columns so every edit can be checked before handoff.",
    ],
    deliverables: [
      "Twelve-row cleaned catalog",
      "Source issue and correction notes",
      "QA status and review summary",
    ],
    artifact: {
      label: "Download cleaned sample CSV",
      href: "/projects/product-data-cleanup.csv",
    },
  },
  {
    id: "customer-support-library",
    title: "Customer Support Response Library",
    category: "Operations",
    description:
      "Twelve adaptable response templates for common questions, order delays, refunds, handoffs, and escalations.",
    evidence: "12 reply templates",
    tools: ["Gmail", "Zendesk", "Notion"],
    color: "peach",
    preview: "support",
    brief:
      "Create a practical reply library for a fictional online shop while keeping the tone warm, the next step clear, and sensitive cases ready for human review.",
    approach: [
      "Group recurring requests by intent, urgency, and escalation risk.",
      "Write modular responses with visible placeholders instead of pretending customer details are known.",
      "Add pre-send checks and escalation notes for refunds, damage, privacy, and payment concerns.",
    ],
    deliverables: [
      "Twelve reusable response templates",
      "Tone and personalization guide",
      "Escalation and pre-send checklist",
    ],
    artifact: {
      label: "Download response library",
      href: "/projects/customer-support-response-library.md",
    },
  },
  {
    id: "meeting-to-brief",
    title: "Meeting Notes & Action Brief",
    category: "Content",
    description:
      "A concise recap, content brief, open-question log, and action register with clear owners.",
    evidence: "6-action register",
    tools: ["Google Docs", "Notion", "Trello"],
    color: "rose",
    preview: "meeting",
    brief:
      "Transform a fictional newsletter planning call into a concise written recap, a content brief, and a clear list of decisions still needed.",
    approach: [
      "Separate confirmed decisions from ideas and unanswered questions.",
      "Convert discussion into a brief with an audience, message, and outline.",
      "Give every action a named role, deadline, and completion condition.",
    ],
    deliverables: [
      "Sample meeting recap",
      "Newsletter content brief",
      "Action register and handoff checklist",
    ],
    artifact: {
      label: "Download meeting-to-brief kit",
      href: "/projects/meeting-to-brief-kit.md",
    },
  },
  {
    id: "content-planner",
    title: "Content Planning Calendar",
    category: "Content",
    description:
      "Ten planned posts with draft captions, visual briefs, accessibility notes, owners, and review dates.",
    evidence: "10-post calendar",
    tools: ["Google Sheets", "Canva", "Buffer"],
    color: "lavender",
    preview: "social",
    brief:
      "Plan two weeks of content for a fictional home-office brand, balancing useful tips, conversation starters, and product storytelling.",
    approach: [
      "Set clear content pillars and give each post a practical purpose.",
      "Write sample captions and practical visual briefs for each format.",
      "Include review status, accessibility notes, and a publishing handoff.",
    ],
    deliverables: [
      "Ten-post sample calendar",
      "Draft captions and visual briefs",
      "Review and accessibility checklist fields",
    ],
    artifact: {
      label: "Download content calendar",
      href: "/projects/two-week-content-calendar.csv",
    },
  },
  {
    id: "competitor-research",
    title: "Competitor Research Brief",
    category: "Data & research",
    description:
      "Six fictional competitors compared across positioning, offer, audience, content channels, strengths, gaps, and source notes.",
    evidence: "6-company comparison",
    tools: ["Google Sheets", "Google Docs", "Notion"],
    color: "lavender",
    preview: "research",
    brief:
      "Build a decision-friendly practice research brief for a fictional remote-work brand exploring how comparable companies present their offers.",
    approach: [
      "Set comparison criteria before collecting notes so every profile follows the same structure.",
      "Separate observable sample facts from interpretation and mark every source as fictional.",
      "Summarize patterns, open questions, and next research steps without making unsupported recommendations.",
    ],
    deliverables: [
      "Six structured competitor profiles",
      "Comparison matrix and pattern summary",
      "Source log and follow-up questions",
    ],
    artifact: {
      label: "Download research brief",
      href: "/projects/competitor-research-brief.md",
    },
  },
  {
    id: "travel-calendar",
    title: "Travel & Calendar Plan",
    category: "Administration",
    description:
      "A three-day sample itinerary with time zones, preparation steps, buffers, confirmations, and contingency notes.",
    evidence: "3-day itinerary",
    tools: ["Google Calendar", "Google Docs", "Google Maps"],
    color: "blue",
    preview: "calendar",
    brief:
      "Prepare a fictional Singapore-to-Sydney work trip with a readable agenda, clear time zones, and space for the unexpected.",
    approach: [
      "Build the schedule around meeting goals and realistic transition time.",
      "Label local times and separate planning placeholders from confirmed details.",
      "Add a preparation checklist and a simple disruption plan.",
    ],
    deliverables: [
      "Three-day sample itinerary",
      "Booking and document checklist",
      "Contingency notes",
    ],
    artifact: {
      label: "Download sample itinerary",
      href: "/projects/work-trip-itinerary.md",
    },
  },
  {
    id: "file-organization",
    title: "File Organization & Naming System",
    category: "Administration",
    description:
      "A five-folder shared-drive structure with naming rules, permissions, an archive routine, and a 24-file migration checklist.",
    evidence: "24-file migration plan",
    tools: ["Google Drive", "Dropbox", "Microsoft OneDrive"],
    color: "sage",
    preview: "files",
    brief:
      "Reorganize a fictional small team's cluttered shared drive into a structure that makes active work easy to find and old material safe to archive.",
    approach: [
      "Inventory files by purpose, owner, sensitivity, and current status.",
      "Create a shallow folder map and one readable naming convention for recurring documents.",
      "Plan the move in batches with duplicate, permission, and broken-link checks before archiving.",
    ],
    deliverables: [
      "Five-folder shared-drive map",
      "Naming and version-control rules",
      "Twenty-four-file migration checklist",
    ],
    artifact: {
      label: "Download file organization kit",
      href: "/projects/file-organization-system.md",
    },
  },
];
