import Link from 'next/link';

import { DocumentsView } from '../components/documents-view';

export default function DraftsPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Drafts</p>
        <h1>Draft Documents</h1>
        <p>Create, edit, delete, and submit draft documents.</p>
        <Link className="button" href="/documents/create">
          Create Document
        </Link>
      </div>
      <DocumentsView path="/drafts" title="Drafts" />
    </section>
  );
}
