# Document Routing Test

This test proves that FaithOS can move documents between departments without paper.

## Test roles

- Originating staff user
- Receiving department user
- Administrator or department head

## Steps

1. Log in as the originating user.
2. Open `/documents/create`.
3. Create a document with realistic title, subject, body, category, priority, and confidentiality.
4. Save as draft.
5. Upload a supported attachment.
6. Submit the draft.
7. Forward or route the document to another department.
8. Log in as a receiving user.
9. Open `/inbox`.
10. Receive the document.
11. Return one test document with comments.
12. Forward one test document to a second department.
13. Open the document timeline.

## Expected result

- The document receives a reference number.
- The attachment is visible and downloadable by authorized users.
- Inbox, Sent, Drafts, and Archive reflect the correct state.
- Timeline records created, submitted, forwarded, received, and returned actions.
