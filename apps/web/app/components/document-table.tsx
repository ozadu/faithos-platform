'use client';

import Link from 'next/link';

import { Status } from './status';
import { type DocumentRecord, type InboxRecord } from '../lib/api-client';

export function DocumentTable({
  documents,
}: {
  documents: Array<DocumentRecord | InboxRecord>;
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Title</th>
          <th>Department</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Updated / Received</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((document) => {
          const isInboxRecord = 'receivedDate' in document;
          const department = isInboxRecord
            ? document.fromDepartment?.name
            : document.currentDepartment?.name;
          const date = isInboxRecord
            ? document.receivedDate
            : document.updatedAt;
          return (
            <tr key={document.id}>
              <td>
                <Link href={`/documents/${document.id}`}>
                  {document.referenceNumber}
                </Link>
              </td>
              <td>{document.title}</td>
              <td>{department}</td>
              <td>{document.priority}</td>
              <td>
                <Status
                  tone={
                    'unread' in document && document.unread ? 'warn' : 'neutral'
                  }
                >
                  {document.status}
                </Status>
              </td>
              <td>{new Date(date).toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
