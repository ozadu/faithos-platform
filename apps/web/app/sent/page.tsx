import { DocumentsView } from '../components/documents-view';

export default function SentPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Sent</p>
        <h1>Sent Documents</h1>
        <p>Documents created or submitted by you.</p>
      </div>
      <DocumentsView path="/sent" title="Sent" />
    </section>
  );
}
