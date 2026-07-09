'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { AuthRequired } from '../../components/auth-required';
import { apiFetch, type DocumentRecord } from '../../lib/api-client';

export default function CreateDocumentPage() {
  const [created, setCreated] = useState<DocumentRecord | null>(null);
  const [message, setMessage] = useState('Fill the form and save a real draft.');

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('Creating draft...');
    try {
      const response = await apiFetch<DocumentRecord>('/documents', {
        body: JSON.stringify({
          body: String(form.get('body') ?? ''),
          category: String(form.get('category') ?? ''),
          confidentiality: String(form.get('confidentiality') ?? 'INTERNAL'),
          priority: String(form.get('priority') ?? 'NORMAL'),
          subject: String(form.get('subject') ?? ''),
          title: String(form.get('title') ?? ''),
        }),
        method: 'POST',
      });
      setCreated(response.data);
      setMessage(`Draft created: ${response.data.referenceNumber}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Create Document</p>
          <h1>New Draft</h1>
          <p>Compose an internal document and save it through `POST /documents`.</p>
        </div>
        <form className="panel form-grid" onSubmit={create}>
          <label>
            Title
            <input name="title" placeholder="Quarterly budget review" required />
          </label>
          <label>
            Category
            <input name="category" placeholder="Finance" required />
          </label>
          <label className="full">
            Subject
            <input name="subject" placeholder="Request for review" required />
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
            <textarea name="body" placeholder="Write the document body..." required rows={8} />
          </label>
          <div className="full actions">
            <button type="submit">Save Draft</button>
            {created ? (
              <Link className="button secondary" href={`/documents/${created.id}`}>
                Open Created Draft
              </Link>
            ) : null}
          </div>
          <p className="full">{message}</p>
        </form>
      </section>
    </AuthRequired>
  );
}
