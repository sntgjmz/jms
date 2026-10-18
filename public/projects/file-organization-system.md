# Shared-Drive Organization & Migration Kit

> **Fictional portfolio sample.** The team, filenames, owners, and access decisions below are invented to demonstrate an administrative file-organization workflow.

## Goal

Move 24 sample files from a cluttered shared drive into a shallow structure that makes active work easy to find, assigns an owner to sensitive folders, and preserves older material without mixing it into daily work.

## Working rules

1. Inventory first; move files only after the proposed destination is reviewed.
2. Keep the folder structure shallow. Use searchable filenames instead of many nested folders.
3. Do not rename a final or signed document without confirming its record status.
4. Do not broaden permissions during migration.
5. Record duplicates, broken links, missing owners, and uncertain destinations in the exception log.

## Folder map

```text
Team Drive/
├── 01_Admin/
│   ├── Finance/
│   ├── People/
│   └── Policies/
├── 02_Clients/
│   ├── Active/
│   └── Closed/
├── 03_Projects/
│   ├── Active/
│   └── Completed/
├── 04_Resources/
│   ├── Brand/
│   ├── Templates/
│   └── Reference/
└── 99_Archive/
    ├── 2024/
    └── 2025/
```

## Naming convention

Use:

```text
YYYY-MM-DD_Client-or-Team_Document-Name_v01_Status.ext
```

Examples:

- `2026-04-08_Acorn-Studio_Kickoff-Notes_v01_Draft.docx`
- `2026-04-12_Team_Weekly-Status_v02_Approved.xlsx`
- `2026-05-01_Northwind_Project-Closeout_v01_Final.pdf`

### Naming decisions

- Use ISO dates so files sort chronologically.
- Use hyphens inside names and underscores between major fields.
- Use two-digit version numbers: `v01`, `v02`, `v03`.
- Use only `Draft`, `Review`, `Approved`, or `Final` for status.
- Avoid labels such as `latest`, `new`, `final-final`, initials, and unexplained abbreviations.
- Preserve original signed-file names in the migration log if a record must be renamed.

## Permission map

| Folder | Default access | Owner | Review rule |
| --- | --- | --- | --- |
| `01_Admin/Finance` | Finance owner only | Operations lead | Review quarterly |
| `01_Admin/People` | Operations lead only | Operations lead | Review after staffing changes |
| `01_Admin/Policies` | Team view, owner edit | Operations lead | Review every six months |
| `02_Clients/Active` | Assigned project team | Account owner | Review at project close |
| `02_Clients/Closed` | Account owner and operations | Account owner | Remove external access before move |
| `03_Projects/Active` | Assigned project team | Project owner | Review monthly |
| `03_Projects/Completed` | Team view, owner edit | Project owner | Archive after 90 days |
| `04_Resources` | Team view, designated editors | Operations lead | Review every six months |
| `99_Archive` | Team view, operations edit | Operations lead | Review annually |

## 24-file migration checklist

| # | Current sample filename | Proposed destination | Proposed clean filename | Owner | Check | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | `Kickoff notes acorn.docx` | `02_Clients/Active/Acorn-Studio` | `2026-04-08_Acorn-Studio_Kickoff-Notes_v01_Draft.docx` | Account owner | Confirm date | Ready |
| 02 | `acorn brief FINAL.pdf` | `02_Clients/Active/Acorn-Studio` | `2026-04-10_Acorn-Studio_Project-Brief_v01_Final.pdf` | Account owner | Preserve original | Ready |
| 03 | `acorn access.txt` | `02_Clients/Active/Acorn-Studio` | `2026-04-10_Acorn-Studio_Access-Register_v01_Review.txt` | Account owner | Sensitive data review | Hold |
| 04 | `NW proposal v3.docx` | `02_Clients/Active/Northwind` | `2026-03-22_Northwind_Proposal_v03_Approved.docx` | Account owner | Confirm approval | Ready |
| 05 | `northwind logo.png` | `02_Clients/Active/Northwind/Assets` | `2026-03-25_Northwind_Primary-Logo_v01_Approved.png` | Account owner | Check usage rights | Ready |
| 06 | `close out - northwind.pdf` | `02_Clients/Closed/Northwind` | `2026-05-01_Northwind_Project-Closeout_v01_Final.pdf` | Account owner | Remove external access | Ready |
| 07 | `team meeting april.docx` | `01_Admin/Policies` | `2026-04-30_Team_Operations-Meeting_v01_Final.docx` | Operations lead | Confirm destination | Review |
| 08 | `weekly tracker NEW.xlsx` | `04_Resources/Templates` | `2026-04-12_Team_Weekly-Status_v02_Approved.xlsx` | Operations lead | Check formulas | Ready |
| 09 | `leave request template.docx` | `04_Resources/Templates` | `2026-02-01_Team_Leave-Request_v01_Approved.docx` | Operations lead | Confirm current version | Ready |
| 10 | `brand colours.pdf` | `04_Resources/Brand` | `2026-01-15_Team_Brand-Color-Guide_v01_Final.pdf` | Design owner | Check duplicate | Ready |
| 11 | `logo package.zip` | `04_Resources/Brand` | `2026-01-15_Team_Logo-Package_v01_Final.zip` | Design owner | Scan and inspect | Ready |
| 12 | `email signature.ai` | `04_Resources/Brand` | `2026-01-15_Team_Email-Signature_v01_Approved.ai` | Design owner | Confirm editable source | Ready |
| 13 | `client intake old.docx` | `99_Archive/2025` | `2025-06-09_Team_Client-Intake_v01_Archived.docx` | Operations lead | Do not reuse | Ready |
| 14 | `client intake.docx` | `04_Resources/Templates` | `2026-03-03_Team_Client-Intake_v02_Approved.docx` | Operations lead | Cross-link from SOP | Ready |
| 15 | `content calendar copy.xlsx` | `03_Projects/Active/Content` | `2026-05-04_Team_Content-Calendar_v01_Draft.xlsx` | Content owner | Check duplicate | Review |
| 16 | `content calendar.xlsx` | `03_Projects/Active/Content` | `2026-05-04_Team_Content-Calendar_v02_Review.xlsx` | Content owner | Compare with row 15 | Hold |
| 17 | `social assets may.zip` | `03_Projects/Active/Content/Assets` | `2026-05-01_Team_Social-Assets_v01_Review.zip` | Content owner | Scan and index | Ready |
| 18 | `expense policy FINAL2.pdf` | `01_Admin/Policies` | `2026-01-08_Team_Expense-Policy_v02_Final.pdf` | Operations lead | Confirm policy owner | Ready |
| 19 | `invoice tracker.xlsx` | `01_Admin/Finance` | `2026-05-01_Team_Invoice-Tracker_v01_Review.xlsx` | Finance owner | Restrict access | Hold |
| 20 | `contractor list.xlsx` | `01_Admin/People` | `2026-04-01_Team_Contractor-Register_v01_Review.xlsx` | Operations lead | Restrict access | Hold |
| 21 | `Project Pine timeline.xlsx` | `03_Projects/Active/Project-Pine` | `2026-04-14_Project-Pine_Timeline_v01_Review.xlsx` | Project owner | Confirm milestones | Ready |
| 22 | `pine decisions.docx` | `03_Projects/Active/Project-Pine` | `2026-04-21_Project-Pine_Decision-Log_v01_Draft.docx` | Project owner | Add document owner | Ready |
| 23 | `2024 photos.zip` | `99_Archive/2024` | `2024-12-31_Team_Event-Photos_v01_Archived.zip` | Operations lead | Confirm retention | Review |
| 24 | `read me.txt` | `Team Drive` | `2026-05-06_Team_Drive-Guide_v01_Approved.txt` | Operations lead | Update links after move | Ready |

## Exception log

| Item | Issue | Safe next step | Owner |
| --- | --- | --- | --- |
| 03 | File may contain account access information | Review contents and replace credentials with a secure password-manager reference | Account owner |
| 15–16 | Two content calendars may overlap | Compare modified dates, tabs, formulas, and owners before selecting the working file | Content owner |
| 19 | Finance tracker permissions are unknown | Restrict to the finance owner before moving | Finance owner |
| 20 | Contractor register contains personal information | Confirm retention and access policy before moving | Operations lead |
| 23 | Photo retention period is unclear | Ask the owner to approve archive or deletion | Operations lead |

## Migration sequence

### Before moving

- [ ] Export or snapshot the current file list.
- [ ] Confirm owners for all sensitive and final files.
- [ ] Create the approved folder structure.
- [ ] Review duplicate pairs and unresolved destinations.
- [ ] Confirm that external sharing will not expand.

### Move in controlled batches

1. Move reusable team resources.
2. Move active projects and active client files.
3. Move restricted administrative files with their owners.
4. Move closed work and older material into archive folders.
5. Update the drive guide and links only after final destinations are stable.

### After moving

- [ ] Open each moved file and verify it is readable.
- [ ] Test key links and spreadsheet references.
- [ ] Check that the owner and intended viewers still have access.
- [ ] Remove confirmed duplicates only after owner approval.
- [ ] Record unresolved items in the exception log.
- [ ] Send the final folder map and naming guide to the team.

## Handoff summary

- **24** sample files inventoried.
- **17** ready to move after routine checks.
- **3** need a destination, duplicate, or retention decision.
- **4** remain on hold because of sensitive content or access review.
- **0** files should be deleted without owner approval.

*Prepared by Jose Miguel Santiago as a self-directed virtual-assistance portfolio sample.*
