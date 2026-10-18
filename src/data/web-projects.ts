export type WebProject = {
  id: string;
  title: string;
  type: string;
  technologies: string[];
  caseStudy: {
    purpose: string;
    contribution?: string;
    features: string[];
  };
  liveUrl: string | null;
  sourceUrl: string | null;
  demoUrl?: string;
  demos?: {
    label: string;
    href: string;
    description?: string;
  }[];
  screenshot?: string;
  screenshotAlt?: string;
  mobilePreviews?: {
    title: string;
    src: string;
    alt: string;
    href: string;
  }[];
};

// Add your project names, descriptions, tools, and links here when ready.
export const webProjects: WebProject[] = [
  {
    id: "isla-sakay",
    title: "Isla Sakay",
    type: "Boat transport platform",
    technologies: [
      "React",
      "TypeScript",
      "Tailwind CSS",
      "shadcn/ui",
      "MobX",
      "Vite",
      "React Native",
      "Expo",
    ],
    caseStudy: {
      purpose:
        "A boat-booking and trip-operations platform for passengers, administrators, and boat operators.",
      contribution:
        "I developed the original website and mobile app, including the backend and database.",
      features: [
        "Passenger and cargo bookings",
        "Fleet, routes, and schedules",
        "Payments and trip operations",
      ],
    },
    liveUrl: null,
    sourceUrl: null,
    demoUrl: "/demos/isla-sakay/index.html#/dashboard",
    demos: [
      {
        label: "Admin website",
        href: "/demos/isla-sakay/index.html#/dashboard",
        description: "Bookings, fleet & schedules",
      },
      {
        label: "Public website",
        href: "/demos/isla-sakay/index.html#/home",
        description: "Routes & travel information",
      },
      {
        label: "Passenger app",
        href: "/demos/isla-sakay-mobile/index.html?role=passenger",
        description: "Browse trips & manage bookings",
      },
      {
        label: "Boat operator app",
        href: "/demos/isla-sakay-mobile/index.html?role=operator",
        description: "Trip operations & passenger lists",
      },
    ],
    screenshot: "/projects/isla-sakay-dashboard.png",
    screenshotAlt:
      "Isla Sakay boat transport dashboard, showing its original interface with sample booking and fleet data",
    mobilePreviews: [
      {
        title: "Passenger",
        src: "/projects/isla-sakay-passenger.png",
        alt: "Isla Sakay passenger mobile interface with fictional sample travel data",
        href: "/demos/isla-sakay-mobile/index.html?role=passenger",
      },
      {
        title: "Boat operator",
        src: "/projects/isla-sakay-operator.png",
        alt: "Isla Sakay boat operator mobile interface with fictional sample trip data",
        href: "/demos/isla-sakay-mobile/index.html?role=operator",
      },
    ],
  },
  {
    id: "bpbmc",
    title: "BPBMC",
    type: "Clinic management system",
    technologies: ["PHP", "MySQL", "JavaScript", "HTML", "CSS", "Bootstrap"],
    caseStudy: {
      purpose:
        "A role-based clinic system for appointments, patient records, diagnostics, and billing.",
      features: [
        "Patient intake, verification & record lookup",
        "Diagnostics and outpatient billing",
        "Role-specific admin, staff, doctor & patient interfaces",
        "Activity and transaction logs",
      ],
    },
    liveUrl: null,
    sourceUrl: null,
    demoUrl: "/demos/bpbmc/index.html#/main-admin",
    screenshot: "/projects/bpbmc-dashboard.png",
    screenshotAlt:
      "BPBMC original purple and blue clinic dashboard with fictional patient and appointment data",
    demos: [
      { label: "Public website", href: "/demos/bpbmc/index.html#/index", description: "Clinic information & services" },
      { label: "Admin portal", href: "/demos/bpbmc/index.html#/main-admin", description: "Patients, appointments & accounts" },
      { label: "Staff portal", href: "/demos/bpbmc/index.html#/main-staff", description: "Appointments & billing" },
      { label: "Doctor portal", href: "/demos/bpbmc/index.html#/main-doctor", description: "Schedules & patient records" },
      { label: "Patient portal", href: "/demos/bpbmc/index.html#/main-patient", description: "Bookings, records & history" },
    ],
  },
];
