import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { education, experience, training } from "../data/background";
import "./BackgroundSection.css";

const tabs = [
  { id: "experience", label: "Experience", count: experience.length },
  { id: "education", label: "Education", count: education.length },
  { id: "training", label: "Courses & certificates", count: training.length },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function BackgroundSection() {
  const [activeTab, setActiveTab] = useState<TabId>("experience");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section
      id="background"
      className="background-section section-space"
      aria-labelledby="background-title"
    >
      <div className="container">
        <div className="background-heading">
          <div>
            <span className="eyebrow">04 / EDUCATION & EXPERIENCE</span>
            <h2 id="background-title">
              A foundation for
              <br />
              <em>what comes next.</em>
            </h2>
          </div>
          <p>
            I graduated cum laude with a Bachelor of Science in Information
            Technology from STI College Ortigas-Cainta in 2024. My background
            includes internships in graphic design and site reliability
            engineering. I bring that mix of design, technology, and
            organization to web development and virtual assistance.
          </p>
        </div>

        <div className="career-tabs" role="tablist" aria-label="My background">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`career-tab-${tab.id}`}
              className="career-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`career-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
              <span className="career-tab-count" aria-hidden="true">
                {String(tab.count).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>

        <div
          id="career-panel-experience"
          className="career-panel"
          role="tabpanel"
          aria-labelledby="career-tab-experience"
          hidden={activeTab !== "experience"}
          tabIndex={0}
        >
          <ol className="career-timeline">
            {experience.map((entry) => (
              <li className="career-entry" key={entry.organization}>
                <p className="career-date">{entry.dates}</p>
                <div className="career-entry-copy">
                  <div className="career-entry-topline">
                    <h3>{entry.role}</h3>
                    <span className="career-badge">Internship</span>
                  </div>
                  <p className="career-institution">{entry.organization}</p>
                  {entry.description && (
                    <p className="career-description">{entry.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div
          id="career-panel-education"
          className="career-panel"
          role="tabpanel"
          aria-labelledby="career-tab-education"
          hidden={activeTab !== "education"}
          tabIndex={0}
        >
          <ol className="career-timeline">
            {education.map((entry) => (
              <li className="career-entry" key={entry.level}>
                <p className="career-date">{entry.dates}</p>
                <div className="career-entry-copy">
                  <div className="career-entry-topline">
                    <h3>{entry.level}</h3>
                    {entry.distinction && (
                      <span className="career-badge career-badge-honor">
                        <span aria-hidden="true">✧</span> {entry.distinction}
                      </span>
                    )}
                  </div>
                  <p className="career-institution">{entry.institution}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div
          id="career-panel-training"
          className="career-panel"
          role="tabpanel"
          aria-labelledby="career-tab-training"
          hidden={activeTab !== "training"}
          tabIndex={0}
        >
          <p className="career-training-intro">
            Training across networking, databases, Linux, security, and DevOps.
          </p>
          <ul className="career-training-grid">
            {training.map((entry) => (
              <li className="career-training-card" key={entry.title}>
                <div className="career-training-meta">
                  <span className="career-badge">{entry.type}</span>
                  <span>{entry.date}</span>
                </div>
                <h3>{entry.title}</h3>
                <p>{entry.provider}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
