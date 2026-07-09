import { documents } from '../docroute-data';

export default function SentPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Sent</p>
        <h1>Sent Documents</h1>
        <p>Documents created or submitted by you.</p>
      </div>
      <div className="panel">
        <table className="table">
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.reference}</td>
                <td>{document.title}</td>
                <td>{document.currentDepartment}</td>
                <td>{document.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
