import { documents } from '../docroute-data';

export default function InboxPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Inbox</p>
        <h1>My Inbox</h1>
        <p>Documents routed to your department for action.</p>
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Title</th>
              <th>From Department</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Received</th>
              <th>Unread</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.reference}</td>
                <td>{document.title}</td>
                <td>{document.fromDepartment}</td>
                <td>{document.priority}</td>
                <td>{document.status}</td>
                <td>{document.receivedDate}</td>
                <td>
                  <span className={document.unread ? 'badge unread' : 'badge'}>
                    {document.unread ? 'Unread' : 'Read'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
