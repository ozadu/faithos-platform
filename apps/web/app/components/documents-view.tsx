'use client';

import { ResourceList } from './resource-list';
import { DocumentTable } from './document-table';
import { type DocumentRecord, type InboxRecord } from '../lib/api-client';

export function DocumentsView({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  return (
    <ResourceList<DocumentRecord | InboxRecord>
      path={path}
      title={title}
      render={(documents) =>
        documents.length ? (
          <DocumentTable documents={documents} />
        ) : (
          <p>No records found.</p>
        )
      }
    />
  );
}
