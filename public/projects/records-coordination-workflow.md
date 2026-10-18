# Records Intake & Quality-Control Workflow

> **Self-directed portfolio sample using synthetic identifiers only.** This fictional exercise contains no patient information, was not completed in an electronic medical record system, and does not represent medical-records employment or HIPAA certification.

## Purpose

This workflow demonstrates transferable records-coordination skills: careful data entry, required-field checks, standardized statuses, exception routing, traceable handoffs, and privacy-aware handling. It is designed as a practice process for any team that receives sensitive documents or requests.

## Privacy-aware working rules

1. Access only the information needed to complete the assigned task.
2. Use approved systems and communication channels for sensitive records.
3. Do not copy sensitive details into personal notes, unapproved tools, or public channels.
4. Use a synthetic or internal record identifier in trackers whenever a full name is unnecessary.
5. Keep an audit note for completed, held, routed, and duplicate items.
6. Ask the authorized owner when a request, authorization, retention rule, or release instruction is unclear.

## Intake fields

| Field | Why it is captured | Check before saving |
| --- | --- | --- |
| Intake ID | Gives each request a traceable reference | Unique and follows the agreed naming rule |
| Subject ID | Connects the request to the correct internal record | Present and copied exactly from the approved source |
| Document type | Determines routing and required checks | Uses a standard label |
| Received date and channel | Establishes queue order and source | Date is readable; source channel is recorded |
| Source system | Shows where the document came from | Matches the approved system name |
| Service or document date | Supports range and duplicate checks | Blank stays blank if absent; do not guess |
| Page count | Supports completeness checking | Matches the document received |
| Required fields | Flags incomplete requests early | Every required field is present or explicitly marked missing |
| Authorization status | Controls whether the request can move forward | Valid, expired, not required, or pending review |
| Duplicate check | Prevents unnecessary duplicate entry | No match, possible match, or confirmed duplicate |
| Indexing and QA status | Shows current stage | Uses only defined status labels |
| Exception, owner, due date | Makes an issue actionable | Clear next action and responsible queue |

## Standard status labels

| Status | Meaning | Required next action |
| --- | --- | --- |
| Ready | Required checks are complete | Index, route, or close according to the task |
| Needs review | A decision or comparison is required | Assign owner and due date |
| On hold | Required information is missing or not valid | Request correction or clarification; do not infer values |
| Duplicate hold | A matching item may already exist | Compare approved identifiers and metadata before closing |
| Routed | The item belongs to another authorized queue | Record the destination and handoff date |
| Closed | Required action and audit note are complete | Retain the traceable record according to the approved process |

## Five-point quality check

Before moving a record out of the intake queue, verify:

1. **Identifier:** the intake and subject identifiers match the approved source.
2. **Completeness:** required pages and required fields are present.
3. **Dates:** received date, document date, and any authorization dates are readable and consistent.
4. **Authorization:** the request has the documented permission or has been routed for review.
5. **Duplicates:** the file name, date, page count, and identifier have been checked against possible matches.

If any check cannot be completed, set a defined hold or review status and record the reason. Do not estimate, fill blanks from memory, or continue a release without the required authorization.

## Exception workflow

```text
Receive request
  → Create intake record
  → Perform five-point quality check
     → All checks complete: mark Ready and send to the approved next queue
     → Missing or invalid information: mark On hold, record issue and next action
     → Possible duplicate: mark Duplicate hold, route to QA comparison
     → Out of scope: mark Routed, record destination and handoff
  → Add final audit note
```

### Common exceptions

| Exception | Safe response | Owner queue |
| --- | --- | --- |
| Required signature is absent | Hold the item and request a corrected source document | Intake support |
| Authorization is expired or unclear | Do not release; route for authorization review | Authorization review |
| Subject identifier is absent | Return to intake with the exact missing field named | Intake support |
| Possible duplicate is found | Compare approved metadata before closing one record | QA review |
| Document is outside the requested set | Route to the correct authorized queue | Routing |
| Document is unreadable or pages are missing | Record the specific issue and request a new copy | Intake support |

## Customer-service update template

Use only approved language and channels. Replace the bracketed details after verification.

> Hello [Name],
>
> Thank you for your request. We reviewed the information received on [Date]. The item currently needs [specific missing item / authorization review / document comparison] before the next step can be completed.
>
> The responsible team is [Queue], and the next update is expected by [Date]. Your reference is [Intake ID].
>
> Thank you,
> [Authorized team or agent]

## Daily queue review

- [ ] Review new records in received-date order.
- [ ] Check all items due today and overdue items.
- [ ] Confirm every hold has a stated exception, owner, and next action.
- [ ] Confirm every routed item has a destination and handoff note.
- [ ] Review duplicate holds with the QA queue.
- [ ] Update completed items with a concise audit note.
- [ ] Escalate process variations or unclear instructions through the approved channel.

## Sample quality summary

The associated CSV contains 15 fictional request records:

- **9** ready for the next approved step
- **4** needing review or routing
- **2** on hold for missing or invalid information
- **0** real people, real patient details, or real documents

*Prepared by Jose Miguel Santiago as a self-directed virtual-assistance portfolio sample.*
