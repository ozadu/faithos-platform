export default function CreateDocumentPage() {
  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Create Document</p>
        <h1>New Draft</h1>
        <p>Compose an internal document, save it as a draft, then submit it.</p>
      </div>
      <form className="panel form-grid">
        <label>
          Title
          <input name="title" placeholder="Quarterly budget review" />
        </label>
        <label>
          Category
          <input name="category" placeholder="Finance" />
        </label>
        <label className="full">
          Subject
          <input name="subject" placeholder="Request for review" />
        </label>
        <label>
          Priority
          <select name="priority" defaultValue="NORMAL">
            <option>LOW</option>
            <option>NORMAL</option>
            <option>HIGH</option>
            <option>URGENT</option>
          </select>
        </label>
        <label>
          Confidentiality
          <select name="confidentiality" defaultValue="INTERNAL">
            <option>PUBLIC</option>
            <option>INTERNAL</option>
            <option>CONFIDENTIAL</option>
            <option>RESTRICTED</option>
          </select>
        </label>
        <label className="full">
          Body
          <textarea
            name="body"
            placeholder="Write the document body..."
            rows={8}
          />
        </label>
        <label className="full">
          Attachments
          <input
            accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
            name="attachments"
            type="file"
          />
        </label>
        <div className="full">
          <button type="button">Save Draft</button>
        </div>
      </form>
    </section>
  );
}
