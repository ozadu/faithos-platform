export default function ArchivePage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Archive</p>
        <h1>Archived Documents</h1>
        <p>Documents removed from active routing are retained here.</p>
      </div>
      <div className="panel">
        <table className="table">
          <tbody>
            <tr>
              <td>DOC-2026-000006</td>
              <td>Leadership briefing note</td>
              <td>Executive Office</td>
              <td>
                <span className="badge">ARCHIVED</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
