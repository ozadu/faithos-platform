'use client';

import { FormEvent, useEffect, useState } from 'react';

import { AuthRequired } from '../../components/auth-required';
import { PlannedBadge } from '../../components/planned-badge';
import { Status } from '../../components/status';
import {
  apiFetch,
  getAccessToken,
  type Department,
  type DocumentRecord,
} from '../../lib/api-client';

export function DocumentDetailClient({ id }: { id: string }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [message, setMessage] = useState('Loading document...');

  async function load() {
    try {
      const [documentResponse, departmentResponse] = await Promise.all([
        apiFetch<DocumentRecord>(`/documents/${id}`),
        apiFetch<Department[]>('/departments'),
      ]);
      setDocument(documentResponse.data);
      setDepartments(departmentResponse.data);
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load document');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(path: string, body: Record<string, string> = {}) {
    setMessage(`Calling ${path}...`);
    try {
      await apiFetch<DocumentRecord>(path, {
        body: JSON.stringify(body),
        method: 'POST',
      });
      await load();
      setMessage('Action completed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const token = getAccessToken();
    setMessage('Uploading attachment...');
    try {
      const response = await fetch(`/api/proxy/documents/${id}/attachments`, {
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        method: 'POST',
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Upload failed');
      event.currentTarget.reset();
      await load();
      setMessage('Attachment uploaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  }

  async function deleteAttachment(attachmentId: string) {
    setMessage('Deleting attachment...');
    try {
      await apiFetch<null>(`/attachments/${attachmentId}`, { method: 'DELETE' });
      await load();
      setMessage('Attachment deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  async function downloadAttachment(attachmentId: string, fileName: string) {
    const token = getAccessToken();
    setMessage('Downloading attachment...');
    try {
      const response = await fetch(
        `/api/proxy/attachments/${attachmentId}/download`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Attachment download started.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        {document ? (
          <>
            <div className="hero">
              <p className="eyebrow">{document.referenceNumber}</p>
              <h1>{document.title}</h1>
              <p>
                {document.senderDepartment?.name} → {document.currentDepartment?.name}
              </p>
              <Status>{document.status}</Status>
            </div>

            <section className="panel stack">
              <h2>Document Detail</h2>
              <dl className="detail-grid">
                <div>
                  <dt>Subject</dt>
                  <dd>{document.subject}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{document.category}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>{document.priority}</dd>
                </div>
                <div>
                  <dt>Confidentiality</dt>
                  <dd>{document.confidentiality}</dd>
                </div>
              </dl>
              <p>{document.body}</p>
              <p>{message}</p>
            </section>

            <section className="panel stack">
              <h2>Routing Actions</h2>
              <div className="actions">
                <button
                  type="button"
                  onClick={() =>
                    void action(`/documents/${id}/submit`, {
                      note: 'Submitted from UAT screen.',
                    })
                  }
                >
                  Submit Document
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void action(`/documents/${id}/receive`, {
                      note: 'Received from UAT screen.',
                    })
                  }
                >
                  Receive Document
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void action(`/documents/${id}/return`, {
                      note: 'Returned from UAT screen.',
                    })
                  }
                >
                  Return Document
                </button>
              </div>
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void action(`/documents/${id}/forward`, {
                    departmentId: String(form.get('departmentId') ?? ''),
                    note: String(form.get('note') ?? 'Forwarded from UAT screen.'),
                  });
                }}
              >
                <label>
                  Forward to department
                  <select name="departmentId">
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Note
                  <input name="note" placeholder="Please review" />
                </label>
                <div className="full">
                  <button type="submit">Forward Document</button>
                </div>
              </form>
              <p>
                Approval/rejection actions are not implemented in the backend yet.{' '}
                <PlannedBadge />
              </p>
            </section>

            <section className="panel stack">
              <h2>Attachments</h2>
              <form className="form-grid" onSubmit={upload}>
                <label className="full">
                  Upload attachment
                  <input
                    accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
                    name="file"
                    required
                    type="file"
                  />
                </label>
                <div className="full">
                  <button type="submit">Upload Attachment</button>
                </div>
              </form>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>MIME</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(document.attachments ?? []).map((attachment) => (
                    <tr key={attachment.id}>
                      <td>{attachment.fileName}</td>
                      <td>{attachment.mimeType}</td>
                      <td>{attachment.sizeBytes}</td>
                      <td className="actions">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() =>
                            void downloadAttachment(
                              attachment.id,
                              attachment.fileName,
                            )
                          }
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAttachment(attachment.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>Routing Timeline</h2>
              <ol className="timeline">
                {(document.timeline ?? []).map((event) => (
                  <li key={event.id}>
                    <strong>{event.action}</strong>
                    <p>{event.note ?? 'No note recorded.'}</p>
                    <small>{new Date(event.createdAt).toLocaleString()}</small>
                  </li>
                ))}
              </ol>
            </section>

            <section className="panel">
              <h2>Routing History</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Read</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(document.routes ?? []).map((route) => (
                    <tr key={route.id}>
                      <td>{route.action}</td>
                      <td>{route.fromDepartment?.name}</td>
                      <td>{route.toDepartment?.name}</td>
                      <td>{route.isRead ? 'Yes' : 'No'}</td>
                      <td>{new Date(route.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <div className="panel">{message}</div>
        )}
      </section>
    </AuthRequired>
  );
}
