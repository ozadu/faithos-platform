import { documents, timeline } from '../../docroute-data';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document =
    documents.find((candidate) => candidate.id === id) ?? documents[0];

  if (!document) {
    return null;
  }

  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">{document.reference}</p>
        <h1>{document.title}</h1>
        <p>
          {document.fromDepartment} → {document.currentDepartment}
        </p>
        <span className="badge">{document.status}</span>
      </div>
      <div className="panel">
        <h2>Timeline</h2>
        <ol className="timeline">
          {timeline.map(([action, description, date]) => (
            <li key={`${action}-${date}`}>
              <strong>{action}</strong>
              <p>{description}</p>
              <small>{date}</small>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
