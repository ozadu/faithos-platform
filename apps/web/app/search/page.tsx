export default function SearchPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Search</p>
        <h1>Find Documents</h1>
        <p>
          Search by reference, title, department, sender, status, date, or
          priority.
        </p>
      </div>
      <form className="panel form-grid">
        <label>
          Reference Number
          <input name="referenceNumber" placeholder="DOC-2026-000001" />
        </label>
        <label>
          Title
          <input name="title" placeholder="Budget" />
        </label>
        <label>
          Department
          <input name="department" placeholder="Finance" />
        </label>
        <label>
          Sender
          <input name="sender" placeholder="Operations" />
        </label>
        <label>
          Status
          <select name="status">
            <option value="">Any</option>
            <option>DRAFT</option>
            <option>SUBMITTED</option>
            <option>IN_REVIEW</option>
            <option>FORWARDED</option>
            <option>RETURNED</option>
            <option>ARCHIVED</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority">
            <option value="">Any</option>
            <option>LOW</option>
            <option>NORMAL</option>
            <option>HIGH</option>
            <option>URGENT</option>
          </select>
        </label>
        <label>
          Date From
          <input name="dateFrom" type="date" />
        </label>
        <label>
          Date To
          <input name="dateTo" type="date" />
        </label>
        <div className="full">
          <button type="button">Search</button>
        </div>
      </form>
    </section>
  );
}
