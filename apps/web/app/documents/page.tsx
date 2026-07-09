import Link from 'next/link';

import { documents } from '../docroute-data';

export default function DocumentsPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Documents</p>
        <h1>Document List</h1>
        <p>All routed and draft documents available to the current tenant.</p>
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Title</th>
              <th>Department</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>
                  <Link href={`/documents/${document.id}`}>
                    {document.reference}
                  </Link>
                </td>
                <td>{document.title}</td>
                <td>{document.currentDepartment}</td>
                <td>{document.priority}</td>
                <td>
                  <span className="badge">{document.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
