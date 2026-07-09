import { DocumentsView } from '../components/documents-view';

export default function ArchivePage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Archive</p>
        <h1>Archived Documents</h1>
        <p>Documents removed from active routing are retained here.</p>
      </div>
      <DocumentsView path="/archive" title="Archive" />
    </section>
  );
}
