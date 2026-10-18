import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import ProjectPreview from "./components/ProjectPreview";
import BackgroundSection from "./components/BackgroundSection";
import DevelopmentWork from "./components/DevelopmentWork";
import { projects } from "./data/projects";
import type { Project, ProjectCategory } from "./data/projects";
import { profile } from "./data/profile";
import { sitePath } from "./lib/site-path";
import "./App.css";

type IconName =
  | "arrow"
  | "diagonal"
  | "check"
  | "mail"
  | "calendar"
  | "folder"
  | "spark"
  | "close"
  | "menu"
  | "download"
  | "copy"
  | "sun"
  | "moon";

type Theme = "light" | "dark";

const themeStorageKey = "jose-portfolio-theme";

function getInitialTheme(): Theme {
  const documentTheme = document.documentElement.dataset.theme;
  if (documentTheme === "light" || documentTheme === "dark") {
    return documentTheme;
  }

  try {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch {
    // The system preference below is a safe fallback when storage is blocked.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    diagonal: <path d="M5 19 19 5M5 5h14v14" />,
    check: <path d="m5 12 4 4L19 6" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M4 11h16m-11 5h1m4 0h1" />
      </>
    ),
    folder: <path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z" />,
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
        <path d="M20 2v4m-2-2h4" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </>
    ),
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
  };
  return (
    <svg
      className={`icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Flower({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <ellipse
          key={index}
          cx="50"
          cy="25"
          rx="12"
          ry="24"
          transform={`rotate(${index * 45} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="13" fill="var(--cream)" />
    </svg>
  );
}

function HeroScene() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <div className="scene-orbit" />
      <span className="scene-caption">
        web builds and virtual support
      </span>
      <div className="planner">
        <div className="planner-top">
          <span>THE DIGITAL WORK DESK</span>
          <span>✳</span>
        </div>
        <div className="planner-heading">
          <span>
            Build it.
            <br />
            Organize it.
          </span>
          <span className="planner-date">
            WEB + VA
            <br />
            <b>&lt;/&gt;</b>
          </span>
        </div>
        <div className="planner-tabs">
          <span className="planner-tab-active">Web & systems</span>
          <span>Admin & support</span>
        </div>
        <div className="planner-tasks">
          <div>
            <span className="task-check">
              <Icon name="check" />
            </span>
            <span>
              Build the interface
              <small>Responsive, useful, and clear</small>
            </span>
            <span className="task-tag">DEVELOP</span>
          </div>
          <div>
            <span className="task-check">
              <Icon name="check" />
            </span>
            <span>
              Organize the details
              <small>Data, research, and follow-ups</small>
            </span>
            <span className="task-tag">SUPPORT</span>
          </div>
          <div>
            <span className="task-check task-pending" />
            <span>
              Check the handoff
              <small>Accurate, clear, and ready to use</small>
            </span>
            <span className="task-tag">REVIEW</span>
          </div>
        </div>
        <div className="planner-bottom">
          <span className="tiny-dot" />
          Two skill sets, one careful process.
        </div>
      </div>
      <div className="inbox-note">
        <span className="note-icon">
          <Icon name="spark" />
        </span>
        <div>
          Details organized.
          <small>Accurate and ready to hand off.</small>
        </div>
        <span className="note-check">
          <Icon name="check" />
        </span>
      </div>
      <div className="focus-note">
        <span>BUILD · ORGANIZE · SUPPORT</span>
        <strong>
          Digital work,
          <br />
          <em>done with care.</em>
        </strong>
        <svg viewBox="0 0 80 35" fill="none">
          <path
            d="M4 22c22-26 30-14 24-1S51 44 73 7m-14 3 15-5-2 16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <Flower className="scene-flower" />
      <span className="scene-footnote">built and organized by Jose.</span>
    </div>
  );
}

function ProjectDialog({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!project || !dialog) return;
    dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
    };
  }, [project]);

  function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="project-dialog"
      aria-labelledby="project-dialog-title"
      onCancel={onClose}
      onKeyDown={keepFocusInDialog}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {project && (
        <div className="dialog-inner">
          <button
            type="button"
            className="dialog-close icon-button"
            aria-label="Close project"
            onClick={onClose}
            autoFocus
          >
            <Icon name="close" />
          </button>
          <div className="dialog-heading">
            <span className="eyebrow">
              {project.category} · Self-directed VA sample
            </span>
            <h2 id="project-dialog-title">{project.title}</h2>
            <p>{project.description}</p>
          </div>
          <ProjectPreview kind={project.preview} large />
          <div className="dialog-content">
            <div>
              <h3>The brief</h3>
              <p>{project.brief}</p>
              <h3>The approach</h3>
              <ol>
                {project.approach.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3>What’s included</h3>
              <ul className="deliverable-list">
                {project.deliverables.map((item) => (
                  <li key={item}>
                    <Icon name="check" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="tool-tags">
                <span className="tool-context">Workflow designed for</span>
                {project.tools.map((tool) => (
                  <span key={tool}>{tool}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="dialog-footer">
            <p>
              {project.id === "records-intake-qa" ? (
                <>
                  Synthetic IDs only; no patient or personal data is included.
                  <br />
                  This is a workflow exercise, not medical-records employment or
                  HIPAA certification.
                </>
              ) : (
                <>
                  Created from a fictional scenario to demonstrate my process.
                  <br />
                  No paid client work or measured results are claimed.
                </>
              )}
            </p>
            <div className="dialog-downloads">
              <a
                className="button button-green"
                href={sitePath(project.artifact.href)}
                download
              >
                <Icon name="download" />
                {project.artifact.label}
              </a>
              {project.supportingArtifact && (
                <a
                  className="button dialog-download-secondary"
                  href={sitePath(project.supportingArtifact.href)}
                  download
                >
                  <Icon name="download" />
                  {project.supportingArtifact.label}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Contact() {
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setStatus("Email address copied.");
    } catch {
      setStatus("You can select and copy the email address above.");
    }
  }
  const directEmailHref = `mailto:${profile.email}?subject=${encodeURIComponent(
    "Portfolio inquiry",
  )}`;

  return (
    <section
      className="contact-section"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="container contact-grid">
        <div className="contact-copy">
          <span className="eyebrow">
            <span className="tiny-dot" />
            FOR HIRING MANAGERS & CLIENTS
          </span>
          <h2 id="contact-title">
            Let’s build
            <br />
            something
            <br />
            <em>useful together.</em>
          </h2>
          <p>
            Hiring a virtual assistant, looking for a web developer, or planning
            a project? Email me directly with the role, task, or outcome you need.
          </p>
          <a className="contact-email" href={directEmailHref}>
            {profile.email}
            <Icon name="diagonal" />
          </a>
          <button className="copy-email" type="button" onClick={copyEmail}>
            <Icon name={copied ? "check" : "copy"} />
            {copied ? "Copied to clipboard" : "Copy email address"}
          </button>
          <p className="contact-status" role="status" aria-live="polite">
            {status}
          </p>
          <Flower className="contact-flower" />
        </div>
        <aside className="contact-direct" aria-labelledby="contact-direct-title">
          <div className="contact-direct-heading">
            <span className="contact-direct-kicker">
              <Icon name="mail" />
              DIRECT EMAIL
            </span>
            <h3 id="contact-direct-title">Send the details from your inbox.</h3>
            <p>
              This portfolio does not collect or store contact-form details. Use
              your own email account so you stay in control of the message.
            </p>
          </div>
          <div className="contact-brief">
            <span className="contact-brief-label">HELPFUL DETAILS TO INCLUDE</span>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>What you need</strong>
                  <p>Virtual assistance, web development, or both.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Scope and priorities</strong>
                  <p>The tasks, files, or result you want help with.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Timeline</strong>
                  <p>Your target date and preferred next step.</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="contact-direct-actions">
            <a className="button button-green" href={directEmailHref}>
              Email Jose directly
              <Icon name="diagonal" />
            </a>
            <a className="contact-samples-link" href="#virtual-assistance">
              Review 11 VA samples
              <Icon name="arrow" />
            </a>
          </div>
          <p className="contact-direct-note">
            <Icon name="mail" />
            The first button opens your email app. Nothing is submitted on this site.
          </p>
        </aside>
      </div>
    </section>
  );
}

const categories: ProjectCategory[] = [
  "All samples",
  "Administration",
  "Operations",
  "Data & research",
  "Content",
];
const services: {
  icon: IconName;
  title: string;
  description: string;
  items: string[];
}[] = [
  {
    icon: "folder",
    title: "Websites & web applications",
    description:
      "Responsive interfaces and practical systems shaped around real workflows.",
    items: [
      "Business & portfolio websites",
      "Dashboards, portals & booking flows",
      "Responsive React interfaces",
    ],
  },
  {
    icon: "calendar",
    title: "Virtual assistance & operations",
    description:
      "Structured support for inboxes, calendars, files, onboarding, customer communication, and recurring tasks.",
    items: [
      "Inbox, calendar & file organization",
      "Client onboarding support",
      "Customer support response templates",
      "Documentation & task tracking",
    ],
  },
  {
    icon: "check",
    title: "Records, data entry & research",
    description:
      "Careful record updates with consistent formatting, accuracy checks, status tracking, and clear handoffs.",
    items: [
      "Records organization & status tracking",
      "Data entry & encoding",
      "Spreadsheet cleanup & QA",
      "Online research & summaries",
    ],
  },
  {
    icon: "spark",
    title: "Content & visual support",
    description:
      "Clear content plans and visual materials informed by a graphic design background.",
    items: [
      "Content planning support",
      "Draft captions & briefs",
      "Content graphics",
    ],
  },
];

function App() {
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [category, setCategory] = useState<ProjectCategory>("All samples");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const visibleProjects = projects.filter(
    (project) => category === "All samples" || project.category === category,
  );
  useEffect(() => {
    if (!menuOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#272f2b" : "#f6f1e7");
  }, [theme]);

  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

    function hasSavedTheme() {
      try {
        const savedTheme = window.localStorage.getItem(themeStorageKey);
        return savedTheme === "light" || savedTheme === "dark";
      } catch {
        return false;
      }
    }

    function handleSystemTheme(event: MediaQueryListEvent) {
      if (!hasSavedTheme()) setTheme(event.matches ? "dark" : "light");
    }

    function handleStoredTheme(event: StorageEvent) {
      if (event.key !== themeStorageKey) return;
      if (event.newValue === "light" || event.newValue === "dark") {
        setTheme(event.newValue);
      } else {
        setTheme(systemTheme.matches ? "dark" : "light");
      }
    }

    systemTheme.addEventListener("change", handleSystemTheme);
    window.addEventListener("storage", handleStoredTheme);
    return () => {
      systemTheme.removeEventListener("change", handleSystemTheme);
      window.removeEventListener("storage", handleStoredTheme);
    };
  }, []);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
      } catch {
        // Theme switching still works for this visit when storage is blocked.
      }
      return nextTheme;
    });
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a
            className="wordmark"
            href="#home"
            aria-label={`${profile.name}, home`}
          >
            jose miguel<span className="wordmark-dot">.</span>
            <Flower className="brand-flower" />
          </a>
          <nav
            id="main-navigation"
            className={menuOpen ? "main-nav is-open" : "main-nav"}
            aria-label="Main navigation"
            onClick={() => setMenuOpen(false)}
          >
            <a href="#work">Work & samples</a>
            <a href="#services">How I can help</a>
            <a href="#about">A little about me</a>
            <a href="#background">Background</a>
            <a href="#contact" className="nav-contact">
              Let’s talk
              <Icon name="diagonal" />
            </a>
          </nav>
          <div className="header-actions">
            <button
              className="theme-toggle icon-button"
              type="button"
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              aria-pressed={theme === "dark"}
              title={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              onClick={toggleTheme}
            >
              <Icon name={theme === "dark" ? "moon" : "sun"} />
            </button>
            <button
              ref={menuToggleRef}
              className="menu-toggle icon-button"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <section
          className="hero-section container"
          id="home"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-dot" />
              WEB DEVELOPMENT · VIRTUAL ASSISTANCE
            </span>
            <h1 id="hero-title">
              Web builds &
              <br />
              virtual support.
              <br />
              <em>Done with care.</em>
              <svg
                className="heading-underline"
                viewBox="0 0 320 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 13c67-10 194-14 309-5M17 18c103-6 202-8 289-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </h1>
            <p className="hero-intro">
              Hi, I’m <strong>{profile.name}.</strong>
              <br />I’m a cum laude BSIT graduate who combines responsive web
              development with detail-focused virtual assistance across data
              entry, records organization, research, customer support,
              documentation, and organized admin work.
            </p>
            <div className="hero-actions">
              <a className="button button-green" href="#virtual-assistance">
                View VA samples
                <Icon name="diagonal" />
              </a>
              <a className="text-link" href="#development-work">
                View web projects
                <Icon name="arrow" />
              </a>
            </div>
            <div className="hero-signoff">
              <span className="signoff-line" />
              Built with curiosity. Refined with care.
            </div>
          </div>
          <HeroScene />
        </section>
        <section className="proof-section" aria-label="Portfolio highlights">
          <div className="container proof-inner">
            <dl className="proof-list">
              <div>
                <dt>2</dt>
                <dd>Interactive web systems</dd>
              </div>
              <div>
                <dt>11</dt>
                <dd>Downloadable VA samples</dd>
              </div>
              <div>
                <dt>BSIT</dt>
                <dd>Cum Laude</dd>
              </div>
              <div>
                <dt>Accuracy-first</dt>
                <dd>Data entry & records support</dd>
              </div>
            </dl>
            <div className="audience-paths" aria-label="Choose a path">
              <article className="audience-card audience-card-client">
                <span className="audience-label">VIRTUAL ASSISTANCE</span>
                <div>
                  <h2>Need reliable support behind the scenes?</h2>
                  <p>
                    Review how I organize records, data, research, documents,
                    schedules, customer responses, content, and handoffs.
                  </p>
                </div>
                <nav aria-label="Virtual assistance links">
                  <a href="#virtual-assistance">VA samples</a>
                  <a href="#services">Services</a>
                  <a href="#contact">Contact</a>
                </nav>
              </article>
              <article className="audience-card">
                <span className="audience-label">WEB DEVELOPMENT</span>
                <div>
                  <h2>Need a website or web application?</h2>
                  <p>
                    Explore responsive systems with web, mobile, and multi-role
                    workflows.
                  </p>
                </div>
                <nav aria-label="Web development links">
                  <a href="#development-work">Web projects</a>
                  <a href="#background">Background</a>
                  <a href="#contact">Contact</a>
                </nav>
              </article>
            </div>
          </div>
        </section>
        <div className="service-ribbon">
          <div className="container ribbon-inner">
            <span>VIRTUAL ASSISTANCE</span>
            <span className="ribbon-star">✳</span>
            <span>DATA ENTRY & RECORDS</span>
            <span className="ribbon-star">✳</span>
            <span>WEB DEVELOPMENT</span>
            <span className="ribbon-star ribbon-last">✳</span>
            <span className="ribbon-note">
              Organized support. Responsive builds.
            </span>
          </div>
        </div>
        <section
          className="work-section container section-space"
          id="work"
          aria-labelledby="work-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / PORTFOLIO</span>
              <h2 id="work-title">
                Two ways
                <br />
                <em>I can help.</em>
              </h2>
            </div>
            <p>
              Explore interactive development projects and self-directed
              virtual assistance samples that show how I build, organize, and
              document work.
            </p>
          </div>
          <nav className="work-track-nav" aria-label="Portfolio work types">
            <a href="#virtual-assistance">
              <span>01A</span>
              <strong>Virtual assistance</strong>
              <small>11 downloadable samples</small>
            </a>
            <a href="#development-work">
              <span>01B</span>
              <strong>Web development</strong>
              <small>2 interactive systems</small>
            </a>
          </nav>

          <section
            className="work-track va-showcase"
            id="virtual-assistance"
            aria-labelledby="va-showcase-title"
          >
            <header className="work-track-header">
              <div className="work-track-title">
                <span className="eyebrow">01A / VIRTUAL ASSISTANCE</span>
                <h3 id="va-showcase-title">
                  Organized support,
                  <br />
                  <em>ready to review.</em>
                </h3>
              </div>
              <div className="work-track-intro">
                <span className="work-track-count">11 DOWNLOADABLE SAMPLES</span>
                <p>
                  These fictional, self-directed portfolio exercises show how I
                  approach admin, records, research, customer communication,
                  organization, and content support. Each includes an actual
                  sample deliverable.
                </p>
              </div>
            </header>
            <div className="va-capabilities" aria-label="Virtual assistance capabilities">
              <span>Records coordination</span>
              <span>Data cleanup & QA</span>
              <span>Online research</span>
              <span>Inbox & calendar</span>
              <span>File organization</span>
              <span>Customer support</span>
              <span>Documentation</span>
              <span>Content support</span>
            </div>
            <div className="va-work-standards" aria-label="Virtual assistance work standards">
              <div>
                <span>01</span>
                <strong>Accuracy first</strong>
                <p>Validate required fields and totals before handoff.</p>
              </div>
              <div>
                <span>02</span>
                <strong>Privacy aware</strong>
                <p>Limit sensitive information to what the task requires.</p>
              </div>
              <div>
                <span>03</span>
                <strong>Consistent process</strong>
                <p>Use clear statuses, checklists, and exception notes.</p>
              </div>
              <div>
                <span>04</span>
                <strong>Clear service</strong>
                <p>Communicate status, missing items, and next steps.</p>
              </div>
            </div>
            <div className="work-toolbar">
              <div
                className="category-filters"
                role="group"
                aria-label="Filter virtual assistance samples"
              >
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={
                      category === item ? "filter-button active" : "filter-button"
                    }
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                    {item === "All samples" && (
                      <span>{projects.length.toString().padStart(2, "0")}</span>
                    )}
                  </button>
                ))}
              </div>
              <span className="project-count" role="status">
                {visibleProjects.length.toString().padStart(2, "0")} samples shown
              </span>
            </div>
            <div className="projects-grid">
              {visibleProjects.map((project) => (
                <article
                  className={`project-card card-${project.color}${
                    project.id === "records-intake-qa"
                      ? " project-card-featured"
                      : ""
                  }`}
                  key={project.id}
                >
                  <button
                    type="button"
                    className="project-open"
                    onClick={() => setSelectedProject(project)}
                    aria-label={`View ${project.title} sample`}
                  >
                    <div className="project-image">
                      <span className="project-sample-label">
                        SELF-DIRECTED VA SAMPLE
                      </span>
                      <ProjectPreview kind={project.preview} />
                      <span className="project-image-arrow">
                        <Icon name="diagonal" />
                      </span>
                    </div>
                    <div className="project-meta">
                      <span>{project.category}</span>
                      <span className="project-evidence">{project.evidence}</span>
                    </div>
                    <h4>{project.title}</h4>
                    <p>{project.description}</p>
                    <div className="project-bottom">
                      <span>
                        Designed for: {project.tools.slice(0, 2).join(" / ")}
                      </span>
                      <span className="project-link">
                        View sample
                        <Icon name="diagonal" />
                      </span>
                    </div>
                  </button>
                </article>
              ))}
            </div>
            <p className="work-footnote">
              <Icon name="folder" />
              These fictional samples demonstrate my process, organization, and
              attention to detail. Open any sample to review the brief, approach,
              and downloadable deliverable.
            </p>
          </section>

          <section
            className="work-track development-showcase"
            id="development-work"
            aria-labelledby="development-showcase-title"
          >
            <header className="work-track-header">
              <div className="work-track-title">
                <span className="eyebrow">01B / WEB DEVELOPMENT</span>
                <h3 id="development-showcase-title">
                  Interactive systems,
                  <br />
                  <em>built around real workflows.</em>
                </h3>
              </div>
              <div className="work-track-intro">
                <span className="work-track-count">02 INTERACTIVE SYSTEMS</span>
                <p>
                  Explore Isla Sakay and BPBMC through responsive web and mobile
                  demos with role-based workflows and fictional showcase data.
                </p>
              </div>
            </header>
            <DevelopmentWork />
          </section>

          <div className="work-conversion">
            <div>
              <span className="eyebrow">READY TO WORK TOGETHER</span>
              <h3>Need a website, reliable virtual support, or both?</h3>
              <p>
                Share the result you need, the work involved, and your timeline.
                I’ll reply by email so we can discuss the next step.
              </p>
            </div>
            <div className="work-conversion-actions">
              <a className="button button-green" href="#contact">
                Discuss your project
                <Icon name="diagonal" />
              </a>
              <a className="text-link" href="#background">
                Review my background
                <Icon name="arrow" />
              </a>
            </div>
          </div>
        </section>
        <section
          className="services-section"
          id="services"
          aria-labelledby="services-title"
        >
          <div className="container section-space">
            <div className="section-heading">
              <div>
                <span className="eyebrow">02 / HOW I CAN HELP</span>
                <h2 id="services-title">
                  Web development.
                  <br />
                  <em>Virtual support.</em>
                </h2>
              </div>
              <p>
                Choose a focused website build, organized admin support, or a
                project that needs both.
              </p>
            </div>
            <div className="services-grid">
              {services.map((service, index) => (
                <article className="service-card" key={service.title}>
                  <div className="service-card-top">
                    <span className={`service-icon service-icon-${index}`}>
                      <Icon name={service.icon} />
                    </span>
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <ul>
                    {service.items.map((item) => (
                      <li key={item}>
                        <Icon name="check" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a href="#contact" className="text-link">
                    Let’s talk about it
                    <Icon name="arrow" />
                  </a>
                </article>
              ))}
            </div>
            <div className="client-process" aria-labelledby="process-title">
              <div className="client-process-heading">
                <span className="eyebrow">A SIMPLE WORKFLOW</span>
                <h3 id="process-title">From a clear brief to an organized handoff.</h3>
              </div>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <h4>Brief & priorities</h4>
                    <p>Clarify the goal, source materials, deadline, and definition of done.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h4>Create & review</h4>
                    <p>Build the interface or complete the support work, then review the details.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h4>Check & handoff</h4>
                    <p>Verify the result and package the finished work clearly.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="toolkit">
              <span>Web & support toolkit</span>
              <div>
                {[
                  "React",
                  "TypeScript",
                  "JavaScript",
                  "PHP",
                  "MySQL",
                  "Tailwind CSS",
                  "React Native",
                  "Expo",
                  "Google Workspace",
                  "Notion",
                  "Canva",
                  "Trello",
                ].map((tool) => (
                  <span className="tool-brand" key={tool}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section
          className="about-section container section-space"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="about-visual">
            <div className="about-monogram">
              <span className="monogram-top">
                THOUGHTFUL WORK. HUMAN CONNECTION.
              </span>
              <span className="about-portrait-orbit" aria-hidden="true" />
              <img
                className="about-portrait"
                src={sitePath("/images/jose-miguel-santiago.png")}
                alt="Jose Miguel Santiago"
              />
              <Flower className="monogram-flower" />
              <div className="monogram-bottom">
                <span>JOSE MIGUEL SANTIAGO</span>
                <span>{profile.role.toUpperCase()}</span>
              </div>
            </div>
            <div className="about-note">
              a developer’s mind,
              <br />
              <em>an organizer’s eye.</em>
              <svg viewBox="0 0 90 40" fill="none">
                <path
                  d="M4 12c17 28 32 24 44 8s30-17 35-10m-12 0 14-3-4 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="about-copy">
            <span className="eyebrow">03 / THE PERSON BEHIND THE WORK</span>
            <h2 id="about-title">
              Hi, I’m Jose.
              <br />
              <em>Curiosity into craft.</em>
            </h2>
            <p>
              I’m a web developer and virtual assistant with a {profile.degree} from{" "}
              {profile.college}, where I graduated {profile.academicHonor.toLowerCase()} in{" "}
              {profile.graduationYear}. I build responsive websites and bring the
              same structured approach to data entry, research, customer
              support, records organization, documentation, and content
              planning.
            </p>
            <p>
              My graphic design internship at Innolution Corporation and site
              reliability engineering internship at OpsWerks strengthened my
              visual judgment, technical problem-solving, and attention to
              detail. The virtual assistance samples in this portfolio are
              fictional exercises created so you can review how I organize work.
            </p>
            <div className="about-values">
              <span>
                <Icon name="check" />
                Web development
              </span>
              <span>
                <Icon name="check" />
                Virtual assistance & data support
              </span>
              <span>
                <Icon name="check" />
                A background in design & reliability
              </span>
            </div>
            <div className="about-skills" aria-labelledby="about-skills-title">
              <h3 id="about-skills-title">A careful approach to the details</h3>
              <p>
                Fast, accurate typing and a keen eye for detail support the admin,
                records, research, customer support, documentation, and content
                work I offer.
              </p>
              <ul>
                {profile.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </div>
            <a className="text-link" href="#background">
              Explore my education & experience
              <Icon name="arrow" />
            </a>
            {profile.resumeUrl && (
              <a
                className="resume-link text-link"
                href={sitePath(profile.resumeUrl)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" />
                View my résumé
              </a>
            )}
          </div>
        </section>
        <BackgroundSection />
        <Contact />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <a className="wordmark" href="#home">
            jose miguel<span className="wordmark-dot">.</span>
          </a>
          <p>Thoughtful builds. Reliable support.</p>
          <a href="#home" className="back-top">
            Back to top
            <Icon name="arrow" />
          </a>
          <span className="footer-copyright">
            © {new Date().getFullYear()} {profile.name}
          </span>
        </div>
      </footer>
      <ProjectDialog
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </>
  );
}

export default App;
