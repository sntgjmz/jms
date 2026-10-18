import { useState } from "react";
import { webProjects, type WebProject } from "../data/web-projects";
import { sitePath } from "../lib/site-path";
import "./DevelopmentWork.css";

function ProjectArrow() {
  return (
    <svg
      className="dev-project-arrow"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function ProjectPrimaryAction({ project }: { project: WebProject }) {
  if (project.demoUrl) {
    return (
      <a
        className="dev-project-primary-action"
        href={sitePath(project.demoUrl)}
        target="_blank"
        rel="noreferrer"
        aria-label={`View ${project.title} interactive demo (opens in a new tab)`}
      >
        View interactive demo <ProjectArrow />
      </a>
    );
  }

  if (project.liveUrl) {
    return (
      <a
        className="dev-project-primary-action"
        href={project.liveUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Visit ${project.title} website (opens in a new tab)`}
      >
        Visit website <ProjectArrow />
      </a>
    );
  }

  return (
    <a className="dev-project-primary-action" href="#contact">
      Discuss this project <ProjectArrow />
    </a>
  );
}

function ProjectPreview({ project }: { project: WebProject }) {
  const [preview, setPreview] = useState<"web" | "mobile">("web");
  const demoUrl = project.demoUrl ?? project.liveUrl;
  const hasMobilePreviews = Boolean(project.mobilePreviews?.length);

  return (
    <div className="dev-project-preview">
      <div className="dev-project-preview-top">
        <div className="dev-project-preview-copy">
          <span className="dev-project-preview-label">INTERACTIVE DEMO</span>
          <span className="dev-project-preview-note">
            Portfolio demo &middot; Fictional data &middot; Resets on reload
          </span>
        </div>
        {hasMobilePreviews ? (
          <div
            className="dev-project-preview-switch"
            role="group"
            aria-label={`${project.title} interface previews`}
          >
            <button
              type="button"
              aria-pressed={preview === "web"}
              onClick={() => setPreview("web")}
            >
              Web
            </button>
            <button
              type="button"
              aria-pressed={preview === "mobile"}
              onClick={() => setPreview("mobile")}
            >
              Mobile apps
            </button>
          </div>
        ) : (
          <span className="dev-project-preview-platform">WEB</span>
        )}
      </div>

      {preview === "mobile" ? (
        <div className="dev-project-mobile-previews">
          {project.mobilePreviews?.map((mobile) => (
            <a
              key={mobile.title}
              className="dev-project-mobile-preview"
              href={sitePath(mobile.href)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Explore ${project.title} ${mobile.title.toLowerCase()} app demo (opens in a new tab)`}
            >
              <div className="dev-project-phone-frame">
                <img
                  src={sitePath(mobile.src)}
                  alt={mobile.alt}
                  loading="lazy"
                  width="390"
                  height="844"
                />
              </div>
              <span>
                {mobile.title} <ProjectArrow />
              </span>
            </a>
          ))}
        </div>
      ) : (
        <a
          className="dev-project-screenshot"
          href={demoUrl ? sitePath(demoUrl) : "#contact"}
          target={demoUrl ? "_blank" : undefined}
          rel={demoUrl ? "noreferrer" : undefined}
          aria-label={`Explore ${project.title} web frontend demo${demoUrl ? " (opens in a new tab)" : ""}`}
        >
          <img
            src={project.screenshot ? sitePath(project.screenshot) : ""}
            alt={project.screenshotAlt ?? `${project.title} interface`}
            loading="lazy"
            width="1440"
            height="1000"
          />
        </a>
      )}

    </div>
  );
}

export default function DevelopmentWork() {
  return (
    <div className="dev-work-projects">
      {webProjects.map((project, index) => {
        const projectNumber = String(index + 1).padStart(2, "0");
        const hasContribution = Boolean(project.caseStudy.contribution);

        return (
          <article
            className="dev-project-card"
            key={project.id}
            aria-labelledby={`dev-project-${project.id}`}
          >
            <header className="dev-project-intro">
              <div className="dev-project-identity">
                <div className="dev-project-kicker">
                  <span className="dev-project-number" aria-hidden="true">
                    {projectNumber}
                  </span>
                  <span>
                    {project.mobilePreviews?.length
                      ? "Web + mobile system"
                      : "Multi-role web system"}
                  </span>
                </div>
                <h4 id={`dev-project-${project.id}`}>{project.title}</h4>
                <span className="dev-project-type">{project.type}</span>
              </div>

              <div className="dev-project-overview">
                <p className="dev-project-lead">{project.caseStudy.purpose}</p>
                <div className="dev-project-actions">
                  <ProjectPrimaryAction project={project} />
                </div>
              </div>
            </header>

            {project.screenshot ? (
              <ProjectPreview project={project} />
            ) : (
              <div className="dev-project-cover" aria-hidden="true">
                <div className="dev-project-cover-top">
                  <span>
                    {project.id === "capstone-website"
                      ? "CAPSTONE"
                      : "WEB PROJECT"}
                  </span>
                  <span>{projectNumber}</span>
                </div>
                <span className="dev-project-cover-brace">&#123;</span>
                <div className="dev-project-cover-title">
                  {project.id === "capstone-website" ? (
                    <>
                      Ideas into
                      <br />
                      <em>interfaces.</em>
                    </>
                  ) : (
                    project.title
                  )}
                </div>
                <div className="dev-project-cover-bottom">
                  <span>
                    {project.type === "Academic project"
                      ? "Academic web development"
                      : "Web development"}
                  </span>
                  <span className="dev-project-cover-mark">&#125;</span>
                </div>
              </div>
            )}

            <div
              className={`dev-project-proof${hasContribution ? "" : " dev-project-proof--two"}`}
            >
              {project.caseStudy.contribution && (
                <section className="dev-project-proof-block dev-project-contribution">
                  <h4 className="dev-project-section-label">
                    My contribution
                  </h4>
                  <p>{project.caseStudy.contribution}</p>
                </section>
              )}

              <section className="dev-project-proof-block dev-project-features">
                <h4 className="dev-project-section-label">Core workflows</h4>
                <ul>
                  {project.caseStudy.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </section>

              {project.technologies.length > 0 && (
                <section className="dev-project-proof-block dev-project-technology-group">
                  <h4 className="dev-project-section-label">Tech stack</h4>
                  <ul className="dev-project-technologies">
                    {project.technologies.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {project.demos?.length ? (
              <details className="dev-project-interface-list">
                <summary>Browse {project.demos.length} interfaces</summary>
                <div
                  className="dev-project-demos"
                  role="group"
                  aria-label={`${project.title} interface demos`}
                >
                  {project.demos.map((demo) => (
                    <a
                      key={demo.label}
                      href={sitePath(demo.href)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${demo.label}${demo.description ? `: ${demo.description}` : ""} (opens in a new tab)`}
                    >
                      <span className="dev-project-demo-label">
                        {demo.label} <ProjectArrow />
                      </span>
                      {demo.description && <span>{demo.description}</span>}
                    </a>
                  ))}
                </div>
              </details>
            ) : null}

            {project.sourceUrl && (
              <a
                className="dev-project-source-link"
                href={project.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${project.title} source code (opens in a new tab)`}
              >
                View source <ProjectArrow />
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
}
