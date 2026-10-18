export type EducationEntry = {
  level: string;
  institution: string;
  dates: string;
  distinction?: string;
};

export type ExperienceEntry = {
  role: string;
  organization: string;
  dates: string;
  description?: string;
};

export type TrainingEntry = {
  title: string;
  provider: string;
  date: string;
  type: "Course" | "Certificate";
};

export const education: EducationEntry[] = [
  {
    level: "Bachelor of Science in Information Technology",
    institution: "STI College Ortigas-Cainta",
    dates: "2020 – 2024",
    distinction: "Cum laude",
  },
  {
    level: "Senior High School",
    institution: "STI College Ortigas-Cainta",
    dates: "2018 – 2020",
  },
  {
    level: "Junior High School",
    institution: "Star of Hope Christian School",
    dates: "2014 – 2018",
  },
  {
    level: "Elementary",
    institution: "Star of Hope Christian School",
    dates: "2008 – 2014",
  },
];

export const experience: ExperienceEntry[] = [
  {
    role: "Site Reliability Engineer",
    organization: "OpsWerks",
    dates: "July – August 2024",
  },
  {
    role: "Graphic Designer",
    organization: "Innolution Corporation",
    dates: "February – June 2024",
  },
];

// KodeKloud exam courses are listed as courses, not professional credentials.
export const training: TrainingEntry[] = [
  {
    title: "Docker - SWARM | SERVICES | STACKS - Hands-on",
    provider: "KodeKloud",
    date: "August 2024",
    type: "Course",
  },
  {
    title: "Docker Certified Associate Exam Course",
    provider: "KodeKloud",
    date: "August 2024",
    type: "Course",
  },
  {
    title: "Learning Linux Basics Course & Labs",
    provider: "KodeKloud",
    date: "July 2024",
    type: "Course",
  },
  {
    title: "Red Hat Certified System Administrator",
    provider: "KodeKloud",
    date: "July 2024",
    type: "Course",
  },
  {
    title: "Shell Scripts for Beginners",
    provider: "KodeKloud",
    date: "July 2024",
    type: "Course",
  },
  {
    title: "Fundamentals of DevOps",
    provider: "KodeKloud",
    date: "July 2024",
    type: "Course",
  },
  {
    title: "DevOps Pre-Requisite Course",
    provider: "KodeKloud",
    date: "July 2024",
    type: "Course",
  },
  {
    title: "Docker Training Course for the Absolute Beginner",
    provider: "KodeKloud",
    date: "July 2024",
    type: "Course",
  },
  {
    title: "Ethical Hacking: File Inclusion",
    provider: "Udemy",
    date: "December 2023",
    type: "Certificate",
  },
  {
    title: "Ethical Hacking: Metasploit",
    provider: "Udemy",
    date: "December 2023",
    type: "Certificate",
  },
  {
    title: "Networking Foundations",
    provider: "Huawei Talent Online",
    date: "June 2022",
    type: "Certificate",
  },
  {
    title: "Database Foundations",
    provider: "Oracle Academy",
    date: "June 2022",
    type: "Certificate",
  },
];
