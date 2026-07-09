'use client';

import { FormEvent, useState } from 'react';

import { AuthRequired } from '../components/auth-required';
import { DocumentTable } from '../components/document-table';
import { apiFetch, type DocumentRecord } from '../lib/api-client';

export default function SearchPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [message, setMessage] = useState('Enter filters and search real documents.');

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const key of [
      'referenceNumber',
      'title',
      'status',
      'priority',
      'dateFrom',
      'dateTo',
    ]) {
      const value = String(form.get(key) ?? '');
      if (value) query.set(key, value);
    }

    setMessage('Searching...');
    try {
      const response = await apiFetch<DocumentRecord[]>(
        `/documents${query.size ? `?${query.toString()}` : ''}`,
      );
      setDocuments(response.data);
      setMessage(`${response.data.length} result(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Search failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Search</p>
          <h1>Find Documents</h1>
          <p>Search by reference, title, status, date range, or priority.</p>
        </div>
        <form className="panel form-grid" onSubmit={search}>
          <label>
            Reference Number
            <input name="referenceNumber" placeholder="DOC-2026-000001" />
          </label>
          <label>
            Title
            <input name="title" placeholder="Budget" />
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
            <button type="submit">Search</button>
          </div>
          <p className="full">{message}</p>
        </form>
        <div className="panel">
          {documents.length ? (
            <DocumentTable documents={documents} />
          ) : (
            <p>No results loaded yet.</p>
          )}
        </div>
      </section>
    </AuthRequired>
  );
}
