import { apiBaseUrl, documents } from './docroute-data';

export default function HomePage() {
  const openItems = documents.filter(
    (document) => document.status !== 'ARCHIVED',
  );

  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Sprint 2 MVP</p>
        <h1>DocRoute Core</h1>
        <p>
          Create, submit, route, receive, archive, and search internal
          documents. API target: <code>{apiBaseUrl}</code>
        </p>
      </div>
      <div className="cards">
        <article className="card">
          <span>{openItems.length}</span>
          <p>Open documents</p>
        </article>
        <article className="card">
          <span>2</span>
          <p>Unread inbox items</p>
        </article>
        <article className="card">
          <span>10</span>
          <p>Seeded sample documents</p>
        </article>
      </div>
    </section>
  );
}
