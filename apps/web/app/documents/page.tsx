import { DocumentsView } from '../components/documents-view';

export default function DocumentsPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Documents</p>
        <h1>Document List</h1>
        <p>All routed and draft documents available to the current tenant via API.</p>
      </div>
      <DocumentsView path="/documents" title="Documents" />
    </section>
  );
}
