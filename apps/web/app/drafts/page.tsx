import Link from 'next/link';

import { documents } from '../docroute-data';

export default function DraftsPage() {
  const drafts = documents.filter((document) => document.status === 'DRAFT');

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
      <div className="panel">
        {drafts.length === 0 ? (
          <p>No local preview drafts. Seed data includes drafts in the API.</p>
        ) : (
          <table className="table">
            <tbody>
              {drafts.map((document) => (
                <tr key={document.id}>
                  <td>{document.reference}</td>
                  <td>{document.title}</td>
                  <td>{document.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
