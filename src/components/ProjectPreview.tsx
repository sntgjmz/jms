import { useLayoutEffect, useRef } from "react";
import "./ProjectPreview.css";

export type PreviewKind =
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

type ProjectPreviewProps = {
  kind: PreviewKind;
  large?: boolean;
};

function WindowBar({ label }: { label: string }) {
  return (
    <div className="pp-window-bar">
      <div className="pp-window-dots">
        <i />
        <i />
        <i />
      </div>
      <span>{label}</span>
      <span className="pp-window-menu">···</span>
    </div>
  );
}

function InboxPreview() {
  const messages = [
    [
      "S",
      "Studio team",
      "Your week, thoughtfully organized",
      "Action needed",
      "peach",
    ],
    ["J", "Juniper Studio", "A little project update", "Projects", "sage"],
    ["M", "Monday digest", "Everything in one place", "Reading", "lavender"],
    ["C", "Client notes", "Re: Our next steps", "Follow up", "ochre"],
  ];

  return (
    <div className="pp-window pp-inbox-window">
      <WindowBar label="A calmer inbox" />
      <div className="pp-mail-layout">
        <aside className="pp-mail-sidebar">
          <div className="pp-brand-mark">j.</div>
          <span className="pp-compose">+ Compose</span>
          <div className="pp-mail-folder pp-folder-active">
            <span>Inbox</span>
            <b>4</b>
          </div>
          <div className="pp-mail-folder">
            <span>Starred</span>
            <span>☆</span>
          </div>
          <div className="pp-mail-folder">
            <span>Sent</span>
            <span>↗</span>
          </div>
          <p className="pp-sidebar-label">YOUR LABELS</p>
          <span className="pp-label-dot pp-dot-peach">Action needed</span>
          <span className="pp-label-dot pp-dot-sage">Projects</span>
          <span className="pp-label-dot pp-dot-lavender">Reading</span>
        </aside>
        <div className="pp-mail-main">
          <div className="pp-preview-heading">
            <h4>Good morning.</h4>
            <span>☀</span>
          </div>
          <p className="pp-muted">A little clarity for the day ahead.</p>
          <div className="pp-mail-tabs">
            <b>Priority</b>
            <span>Everything else</span>
            <span>⌕</span>
          </div>
          {messages.map(([initial, name, subject, label, color]) => (
            <div className="pp-message" key={name}>
              <span className={`pp-avatar pp-bg-${color}`}>{initial}</span>
              <div className="pp-message-copy">
                <b>{name}</b>
                <span>{subject}</span>
              </div>
              <i className={`pp-mini-label pp-bg-${color}`}>{label}</i>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarPreview() {
  return (
    <div className="pp-window pp-calendar-window">
      <WindowBar label="A week with room to breathe" />
      <div className="pp-calendar-top">
        <div>
          <span className="pp-eyebrow">JUNIPER STUDIO</span>
          <h4>
            The week ahead <span>↗</span>
          </h4>
        </div>
        <span className="pp-calendar-switch">‹ &nbsp; This week &nbsp; ›</span>
      </div>
      <div className="pp-week-grid">
        {["MON", "TUE", "WED", "THU", "FRI"].map((day, index) => (
          <div className="pp-day" key={day}>
            <span className="pp-day-name">{day}</span>
            <b className={index === 1 ? "pp-today" : ""}>{12 + index}</b>
            {index === 0 && (
              <>
                <div className="pp-event pp-bg-sage">
                  <i>09:00</i>
                  <strong>Weekly planning</strong>
                  <span>Make space for focus</span>
                </div>
                <div className="pp-event pp-event-lower pp-bg-peach">
                  <i>14:00</i>
                  <strong>Studio check-in</strong>
                </div>
              </>
            )}
            {index === 1 && (
              <>
                <div className="pp-event pp-event-offset pp-bg-lavender">
                  <i>10:00</i>
                  <strong>Client call</strong>
                  <span>Brief + next steps</span>
                </div>
                <div className="pp-focus-block">Focus time</div>
              </>
            )}
            {index === 2 && (
              <div className="pp-event pp-event-lower pp-bg-ochre">
                <i>13:00</i>
                <strong>Travel prep</strong>
                <span>All the little details</span>
              </div>
            )}
            {index === 3 && (
              <>
                <div className="pp-focus-block pp-focus-early">Focus time</div>
                <div className="pp-event pp-event-lower pp-bg-sage">
                  <i>14:00</i>
                  <strong>Project review</strong>
                </div>
              </>
            )}
            {index === 4 && (
              <div className="pp-event pp-event-offset pp-bg-peach">
                <i>10:00</i>
                <strong>Weekly wrap-up</strong>
                <span>A fresh start awaits</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OnboardingPreview() {
  const columns = [
    {
      name: "Getting started",
      color: "peach",
      cards: [
        ["Welcome packet", "A warm first hello", "Document"],
        ["Client questionnaire", "Getting to know the project", "Form"],
      ],
    },
    {
      name: "In progress",
      color: "lavender",
      cards: [
        ["Project workspace", "A home for every detail", "Workspace"],
        ["Kickoff call", "Questions + shared goals", "Meeting"],
      ],
    },
    {
      name: "Ready to go",
      color: "sage",
      cards: [
        ["Shared resources", "Everything within reach", "Folder"],
        ["Next steps", "A clear path forward", "Checklist"],
      ],
    },
  ];

  return (
    <div className="pp-window pp-board-window">
      <WindowBar label="From hello to let’s go" />
      <div className="pp-board-top">
        <div>
          <span className="pp-eyebrow">THE CLIENT EXPERIENCE</span>
          <h4>A thoughtful beginning.</h4>
        </div>
        <span className="pp-board-avatar">J</span>
      </div>
      <div className="pp-kanban">
        {columns.map((column) => (
          <div className="pp-kanban-column" key={column.name}>
            <div className="pp-column-title">
              <span className={`pp-status-dot pp-bg-${column.color}`} />
              <b>{column.name}</b>
              <small>2</small>
            </div>
            {column.cards.map(([title, description, tag]) => (
              <div className="pp-task" key={title}>
                <span className={`pp-task-tag pp-bg-${column.color}`}>
                  {tag}
                </span>
                <strong>{title}</strong>
                <p>{description}</p>
                <div className="pp-task-footer">
                  <span>☰</span>
                  <span className="pp-task-check">✓</span>
                </div>
              </div>
            ))}
            <span className="pp-add-task">+ Add a task</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrmPreview() {
  const rows = [
    [
      "Juniper Studio",
      "Creative studio",
      "Follow up",
      "peach",
      "Send introduction",
    ],
    [
      "The Sunday Edit",
      "Lifestyle brand",
      "In progress",
      "lavender",
      "Prepare proposal",
    ],
    ["Bloom & Co.", "Small business", "Connected", "sage", "Schedule a call"],
    ["Gather Collective", "Community", "New lead", "ochre", "Review inquiry"],
    ["Paper House", "Design studio", "Connected", "sage", "Share resources"],
  ];
  return (
    <div className="pp-window pp-crm-window">
      <WindowBar label="Good connections, beautifully kept" />
      <div className="pp-crm-top">
        <div>
          <span className="pp-eyebrow">THE RELATIONSHIP DESK</span>
          <h4>A place for every connection.</h4>
        </div>
        <span className="pp-new-contact">+ New contact</span>
      </div>
      <div className="pp-table-toolbar">
        <span className="pp-table-tab">
          All contacts <b>5</b>
        </span>
        <span>☷ &nbsp; Filter</span>
        <span>⌕ &nbsp; Search</span>
      </div>
      <div className="pp-contact-table">
        <div className="pp-table-row pp-table-head">
          <span>□ &nbsp; Company</span>
          <span>Industry</span>
          <span>Status</span>
          <span>Next step</span>
        </div>
        {rows.map(([name, type, status, color, step]) => (
          <div className="pp-table-row" key={name}>
            <strong>
              <i>□</i>
              {name}
            </strong>
            <span>{type}</span>
            <span>
              <i className={`pp-contact-status pp-bg-${color}`}>{status}</i>
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      <div className="pp-table-bottom">
        <span>5 thoughtful connections</span>
        <span>Made for a clearer follow-up.</span>
      </div>
    </div>
  );
}

function SocialPreview() {
  return (
    <div className="pp-window pp-social-window">
      <WindowBar label="A little intention in every post" />
      <div className="pp-social-top">
        <span className="pp-social-avatar">j.</span>
        <div>
          <h4>Juniper Studio</h4>
          <p className="pp-muted">Content with a little more intention.</p>
        </div>
        <span className="pp-social-badge">Content plan</span>
      </div>
      <div className="pp-posts">
        <div className="pp-post pp-post-sage">
          <span className="pp-post-label">A SMALL REMINDER</span>
          <strong>
            Make room
            <br />
            for good
            <br />
            <em>things.</em>
          </strong>
          <div className="pp-post-flower">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <b />
          </div>
          <span className="pp-post-brand">JUNIPER STUDIO</span>
        </div>
        <div className="pp-post pp-post-ivory">
          <span className="pp-post-label">THE EVERYDAY EDIT</span>
          <div className="pp-post-arch">
            <div className="pp-plant">
              <i />
              <i />
              <i />
              <i />
              <b />
            </div>
            <div className="pp-vase" />
          </div>
          <span className="pp-post-brand">A little space to create.</span>
        </div>
        <div className="pp-post pp-post-peach">
          <span className="pp-post-label">BEHIND THE SCENES</span>
          <strong>
            The little
            <br />
            details
            <br />
            <em>matter.</em>
          </strong>
          <span className="pp-post-spark">✳</span>
          <span className="pp-post-brand">JUNIPER STUDIO</span>
        </div>
      </div>
      <div className="pp-social-footer">
        <span>
          <i className="pp-status-dot pp-bg-sage" /> Ready to schedule
        </span>
        <span>One considered week of content. &nbsp; ↗</span>
      </div>
    </div>
  );
}

function MeetingPreview() {
  return (
    <div className="pp-meeting-layout">
      <div className="pp-meeting-paper">
        <div className="pp-meeting-paper-top">
          <span className="pp-eyebrow">JUNIPER STUDIO / TEAM NOTES</span>
          <span>↗</span>
        </div>
        <h4>
          Good ideas.
          <br />
          <em>Clear next steps.</em>
        </h4>
        <div className="pp-meeting-meta">
          <span>WEEKLY CHECK-IN</span>
          <span>30 MINUTES</span>
        </div>
        <p className="pp-notes-heading">01 &nbsp; What we talked about</p>
        <div className="pp-note-line pp-line-long" />
        <div className="pp-note-line" />
        <p className="pp-notes-heading">02 &nbsp; Moving things forward</p>
        <div className="pp-note-check">
          <span>✓</span>Share the updated project brief
        </div>
        <div className="pp-note-check">
          <span>✓</span>Organize the shared workspace
        </div>
        <div className="pp-note-check">
          <span className="pp-empty-check" />
          Confirm the next check-in
        </div>
        <div className="pp-paper-bottom">
          <span>ALL THE DETAILS, IN ONE PLACE.</span>
          <b>j.</b>
        </div>
      </div>
      <div className="pp-sticky-note">
        <span>THE TAKEAWAY</span>
        <strong>
          A little clarity
          <br />
          goes a long way.
        </strong>
        <i>↗</i>
      </div>
      <span className="pp-paperclip" />
    </div>
  );
}

function SpreadsheetPreview() {
  const rows = [
    ["HM-101", "Linen desk mat", "Workspace", "$24.00", "18", "Ready"],
    ["HM-102", "Oak cable tray", "Workspace", "$36.50", "07", "Ready"],
    ["HM-103", "Ceramic pen cup", "Desk", "$18.00", "12", "Ready"],
    ["HM-104", "Cotton task pouch", "Storage", "$21.75", "09", "Review"],
    ["HM-105", "Brass page clips", "Desk", "$12.00", "32", "Ready"],
    ["HM-106", "Felt laptop sleeve", "Storage", "$29.50", "14", "Ready"],
  ];

  return (
    <div className="pp-window pp-sheet-window">
      <WindowBar label="Product catalog / cleanup review" />
      <div className="pp-sheet-top">
        <div>
          <span className="pp-eyebrow">CATALOG QA WORKSPACE</span>
          <h4>Clean data. Clear handoff.</h4>
        </div>
        <div className="pp-sheet-score">
          <b>12 / 12</b>
          <span>records checked</span>
        </div>
      </div>
      <div className="pp-sheet-toolbar">
        <span className="pp-sheet-tab">Clean catalog</span>
        <span>Issue log</span>
        <span>QA notes</span>
        <i>Filter: All records</i>
      </div>
      <div className="pp-sheet-table">
        <div className="pp-sheet-row pp-sheet-head">
          <span>SKU</span>
          <span>Product name</span>
          <span>Category</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Status</span>
        </div>
        {rows.map(([sku, name, category, price, stock, status]) => (
          <div className="pp-sheet-row" key={sku}>
            <b>{sku}</b>
            <strong>{name}</strong>
            <span>{category}</span>
            <span>{price}</span>
            <span>{stock}</span>
            <i className={status === "Ready" ? "pp-status-ready" : "pp-status-review"}>
              {status}
            </i>
          </div>
        ))}
      </div>
      <div className="pp-sheet-footer">
        <span><i className="pp-dot-ready" />10 ready</span>
        <span><i className="pp-dot-review" />2 for review</span>
        <b>Every change has a source note.</b>
      </div>
    </div>
  );
}

function ResearchPreview() {
  const rows = [
    ["North & Fern", "Calm utility", "Guides", "Strong"],
    ["Common Desk", "Team systems", "Newsletter", "Medium"],
    ["Daymark Studio", "Creative focus", "Social", "Strong"],
    ["Workwell Co.", "Habit building", "Blog", "Medium"],
  ];

  return (
    <div className="pp-window pp-research-window">
      <WindowBar label="Market scan / fictional practice brief" />
      <div className="pp-research-top">
        <div>
          <span className="pp-eyebrow">REMOTE-WORK MARKET SCAN</span>
          <h4>Patterns worth noticing.</h4>
        </div>
        <span className="pp-research-date">RESEARCH BRIEF / 01</span>
      </div>
      <div className="pp-research-stats">
        <div><b>06</b><span>profiles</span></div>
        <div><b>05</b><span>criteria</span></div>
        <div><b>18</b><span>source notes</span></div>
      </div>
      <div className="pp-research-table">
        <div className="pp-research-row pp-research-head">
          <span>Company</span><span>Positioning</span><span>Lead channel</span><span>Clarity</span>
        </div>
        {rows.map(([company, position, channel, clarity]) => (
          <div className="pp-research-row" key={company}>
            <strong>{company}</strong>
            <span>{position}</span>
            <span>{channel}</span>
            <i>{clarity}</i>
          </div>
        ))}
      </div>
      <div className="pp-research-insight">
        <span>EARLY PATTERN</span>
        <p>Useful education appears before the main offer in 4 of 6 sample profiles.</p>
        <b>+ 2 profiles documented in the brief</b>
      </div>
    </div>
  );
}

function FilesPreview() {
  const folders = ["01 Admin", "02 Clients", "03 Projects", "04 Resources", "99 Archive"];
  const files = [
    ["Client kickoff template", "DOC", "Ready"],
    ["Weekly status tracker", "SHEET", "Ready"],
    ["Brand asset index", "DOC", "Review"],
    ["Project closeout checklist", "DOC", "Ready"],
    ["2025 campaign archive", "FOLDER", "Moved"],
  ];

  return (
    <div className="pp-window pp-files-window">
      <WindowBar label="Shared drive / migration workspace" />
      <div className="pp-files-layout">
        <aside className="pp-files-sidebar">
          <div className="pp-drive-brand"><span>J</span><b>Team Drive</b></div>
          <p>FOLDER MAP</p>
          {folders.map((folder, index) => (
            <span className={index === 2 ? "pp-file-folder pp-file-active" : "pp-file-folder"} key={folder}>
              <i>◆</i>{folder}
            </span>
          ))}
          <div className="pp-storage"><span>Migration progress</span><i><b /></i><small>19 of 24 files checked</small></div>
        </aside>
        <div className="pp-files-main">
          <div className="pp-files-top">
            <div><span className="pp-eyebrow">02 CLIENTS / ACTIVE</span><h4>Everything in its place.</h4></div>
            <span className="pp-new-folder">+ New folder</span>
          </div>
          <div className="pp-files-summary">
            <span><b>24</b> files mapped</span>
            <span><b>03</b> permissions to review</span>
            <span><b>00</b> unnamed files</span>
          </div>
          <div className="pp-files-table">
            <div className="pp-file-row pp-file-head"><span>Name</span><span>Type</span><span>QA</span></div>
            {files.map(([name, type, status]) => (
              <div className="pp-file-row" key={name}>
                <strong><i>◇</i>{name}</strong><span>{type}</span><b>{status}</b>
              </div>
            ))}
          </div>
          <div className="pp-files-rule">YYYY-MM-DD_Client_Document_v01</div>
        </div>
      </div>
    </div>
  );
}

function SupportPreview() {
  const templates = [
    ["Order status", "Shipping", "sage"],
    ["Delivery delay", "Shipping", "peach"],
    ["Return request", "Returns", "lavender"],
    ["Damaged item", "Escalate", "ochre"],
    ["Product question", "General", "sage"],
    ["Payment concern", "Escalate", "peach"],
  ];

  return (
    <div className="pp-window pp-support-window">
      <WindowBar label="Customer care / response library" />
      <div className="pp-support-top">
        <div><span className="pp-eyebrow">WARM, CLEAR, USEFUL</span><h4>Replies ready for the right moment.</h4></div>
        <span className="pp-support-count"><b>12</b> templates</span>
      </div>
      <div className="pp-support-layout">
        <div className="pp-template-list">
          <div className="pp-template-search">⌕ &nbsp; Search responses</div>
          {templates.map(([title, group, color], index) => (
            <div className={index === 1 ? "pp-template-item pp-template-active" : "pp-template-item"} key={title}>
              <i className={`pp-bg-${color}`} />
              <div><strong>{title}</strong><span>{group}</span></div>
              <b>›</b>
            </div>
          ))}
        </div>
        <div className="pp-template-detail">
          <span className="pp-template-tag">SHIPPING / DELAY</span>
          <h5>Acknowledge, explain, and give a next step.</h5>
          <div className="pp-reply-box">
            <p>Hi [First name],</p>
            <p>Thank you for checking in. I reviewed the order and the latest update is [status].</p>
            <p>The next step is [action] by [date]. I will follow up if anything changes.</p>
            <span>Personalize the highlighted fields before sending.</span>
          </div>
          <div className="pp-reply-checks"><span>✓ Verify order</span><span>✓ Confirm date</span><span>□ Final read</span></div>
        </div>
      </div>
    </div>
  );
}

function RecordsPreview() {
  const rows = [
    ["R001", "Authorization", "Valid", "Ready", "sage"],
    ["R002", "Referral", "Check", "On hold", "ochre"],
    ["R003", "Progress note", "Duplicate", "Review", "lavender"],
    ["R005", "Release request", "Expired", "Review", "peach"],
    ["R008", "Cover sheet", "Missing ID", "On hold", "ochre"],
  ];

  return (
    <div className="pp-window pp-records-window">
      <WindowBar label="Records intake & quality check" />
      <div className="pp-records-top">
        <div>
          <span className="pp-eyebrow">SYNTHETIC DATA · PRACTICE WORKFLOW</span>
          <h4>Records review queue.</h4>
        </div>
        <span className="pp-records-notice">NO PERSONAL DATA</span>
      </div>
      <div className="pp-records-stats">
        <div><b>15</b><span>received</span></div>
        <div><b>09</b><span>ready</span></div>
        <div><b>04</b><span>review</span></div>
        <div><b>02</b><span>on hold</span></div>
      </div>
      <div className="pp-records-table">
        <div className="pp-records-row pp-records-head">
          <span>ID</span><span>Document</span><span>Check</span><span>Status</span>
        </div>
        {rows.map(([id, document, check, status, color]) => (
          <div className="pp-records-row" key={id}>
            <b>{id}</b>
            <strong>{document}</strong>
            <span>{check}</span>
            <i className={`pp-bg-${color}`}>{status}</i>
          </div>
        ))}
      </div>
      <div className="pp-records-footer">
        <span>✓ Required fields</span>
        <span>✓ Dates & pages</span>
        <span>✓ Authorization</span>
        <span>✓ Duplicate check</span>
        <b>Synthetic identifiers only</b>
      </div>
    </div>
  );
}

const previews = {
  inbox: InboxPreview,
  calendar: CalendarPreview,
  onboarding: OnboardingPreview,
  crm: CrmPreview,
  social: SocialPreview,
  meeting: MeetingPreview,
  spreadsheet: SpreadsheetPreview,
  research: ResearchPreview,
  files: FilesPreview,
  support: SupportPreview,
  records: RecordsPreview,
};

export default function ProjectPreview({
  kind,
  large = false,
}: ProjectPreviewProps) {
  const Preview = previews[kind];
  const previewRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const preview = previewRef.current;
    const artboard = artboardRef.current;
    if (!preview || !artboard) return;

    // Scale the whole miniature, preserving readable spacing between its details.
    const fitArtboard = () => {
      const horizontalSpace = large && preview.clientWidth > 480 ? 84 : 36;
      const verticalSpace = large ? 40 : 36;
      const scale = Math.min(
        (preview.clientWidth - horizontalSpace) / artboard.offsetWidth,
        (preview.clientHeight - verticalSpace) / artboard.offsetHeight,
        large ? 1 : 1.18,
      );
      preview.style.setProperty("--pp-scale", String(Math.max(0.2, scale)));
    };

    fitArtboard();
    const observer = new ResizeObserver(fitArtboard);
    observer.observe(preview);
    observer.observe(artboard);
    return () => observer.disconnect();
  }, [large, kind]);

  return (
    <div
      ref={previewRef}
      className={`project-preview preview-${kind}${large ? " pp-large" : ""}`}
      aria-hidden="true"
    >
      <div ref={artboardRef} className="pp-artboard">
        <Preview />
      </div>
    </div>
  );
}
