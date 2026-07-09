import { DocumentsView } from '../components/documents-view';

export default function InboxPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Inbox</p>
        <h1>My Inbox</h1>
        <p>Documents routed to your department for action.</p>
      </div>
      <DocumentsView path="/inbox" title="Inbox" />
    </section>
  );
}
