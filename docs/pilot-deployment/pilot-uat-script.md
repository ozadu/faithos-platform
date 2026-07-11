# Pilot UAT Script

Run this script with real pilot users. Record results in `/pilot/uat` and keep a copy in the pilot report.

| Test                   | User role             | Steps                                                                  | Expected result                                                        | Pass/Fail           | Comments |
| ---------------------- | --------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------- | -------- |
| Login                  | Any pilot user        | Open `/login`, enter assigned credentials, submit.                     | User reaches dashboard without error.                                  | [ ] Pass / [ ] Fail |          |
| Create document        | Staff user            | Open `/documents/create`, enter realistic document fields, save draft. | Draft is created and visible in Drafts.                                | [ ] Pass / [ ] Fail |          |
| Upload attachment      | Staff user            | Open document detail and upload PDF/DOCX/JPG/PNG test file.            | Attachment metadata appears and file is downloadable.                  | [ ] Pass / [ ] Fail |          |
| Submit document        | Staff user            | Submit the draft.                                                      | Status changes from Draft to Submitted and appears in Sent.            | [ ] Pass / [ ] Fail |          |
| Receive document       | Receiving user        | Open Inbox and receive routed document.                                | Document becomes read/received for the user.                           | [ ] Pass / [ ] Fail |          |
| Forward document       | Department user       | Forward document to another department with comments.                  | Current department changes and timeline records forward action.        | [ ] Pass / [ ] Fail |          |
| Return document        | Department user       | Return document with comments.                                         | Document returns to previous step/sender and history records comments. | [ ] Pass / [ ] Fail |          |
| Start workflow         | Authorized user       | Start assigned workflow for a document.                                | Workflow task is created for first step.                               | [ ] Pass / [ ] Fail |          |
| Approve workflow       | Approver              | Approve current workflow task.                                         | Workflow advances to next step or completes.                           | [ ] Pass / [ ] Fail |          |
| Reject workflow        | Approver              | Reject a test workflow task with reason.                               | Workflow state becomes rejected and history records action.            | [ ] Pass / [ ] Fail |          |
| Complete workflow      | Approver              | Approve final workflow step.                                           | Workflow completes and document state reflects completion.             | [ ] Pass / [ ] Fail |          |
| View notifications     | Any user              | Open `/notifications`.                                                 | User sees relevant notification records and unread state.              | [ ] Pass / [ ] Fail |          |
| View dashboard         | Admin/department head | Open `/dashboard`, `/dashboard/executive`, or `/dashboard/department`. | Dashboard summaries load without runtime error.                        | [ ] Pass / [ ] Fail |          |
| View reports           | Authorized user       | Open `/reports` and at least one report detail page.                   | Report data or empty state loads correctly.                            | [ ] Pass / [ ] Fail |          |
| Export CSV             | Authorized user       | Use CSV export on a supported report.                                  | CSV downloads and opens with expected columns.                         | [ ] Pass / [ ] Fail |          |
| Submit feedback        | Any pilot user        | Open `/feedback`, submit realistic feedback.                           | Feedback saves and user sees confirmation.                             | [ ] Pass / [ ] Fail |          |
| Admin reviews feedback | Admin                 | Open `/admin/feedback`, filter, update status.                         | Feedback status changes to reviewed/planned/resolved/wont-fix.         | [ ] Pass / [ ] Fail |          |

Every failed test must include actual result, screenshot link if available, severity, owner, and next action.
