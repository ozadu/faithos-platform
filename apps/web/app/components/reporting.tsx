'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  apiFetch,
  exportCsv,
  type ReportList,
  type ReportSummary,
  type ReportTableRow,
} from '../lib/api-client';
import { AuthRequired } from './auth-required';

type Column = {
  key: string;
  label: string;
};

type ReportTableConfig = {
  columns: Column[];
  description: string;
  endpoint: string;
  exportPath?: string;
  title: string;
};

const reportLinks = [
  ['/reports/documents', 'Document Reports'],
  ['/reports/workflows', 'Workflow Reports'],
  ['/reports/departments', 'Department Reports'],
  ['/reports/users', 'User Activity Reports'],
  ['/reports/overdue', 'Overdue Reports'],
  ['/reports/turnaround', 'Turnaround Reports'],
  ['/reports/activity', 'Activity Reports'],
] as const;

export function ReportsDashboard() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch<ReportSummary>('/reports/summary');
        setSummary(response.data);
        setMessage('Loaded.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Load failed');
      }
    }

    void load();
  }, []);

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Sprint 5</p>
          <h1>Reporting & Analytics</h1>
          <p>
            Management-ready insight for documents, workflows, departments,
            users, overdue work, turnaround, and operational activity.
          </p>
        </div>

        <p>{message}</p>

        {summary ? (
          <>
            <section className="cards">
              <Metric label="Total Documents" value={summary.totalDocuments} />
              <Metric
                label="Created This Week"
                value={summary.documentsCreatedThisWeek}
              />
              <Metric
                label="Submitted This Week"
                value={summary.documentsSubmittedThisWeek}
              />
              <Metric
                label="Completed This Week"
                value={summary.documentsCompletedThisWeek}
              />
              <Metric
                label="Overdue Workflows"
                value={summary.overdueWorkflows}
              />
              <Metric
                label="Avg Approval Hours"
                value={summary.averageApprovalHours}
              />
            </section>

            <section className="panel">
              <h2>Report library</h2>
              <div className="uat-grid">
                {reportLinks.map(([href, label]) => (
                  <Link className="uat-link" href={href} key={href}>
                    <strong>{label}</strong>
                    <span>Open filters, table, and CSV export.</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>Most active departments</h2>
              <BarList
                items={summary.mostActiveDepartments.map((item) => ({
                  label: item.department.name,
                  value: item.totalActivity,
                }))}
              />
            </section>

            <section className="panel">
              <h2>Most active users</h2>
              <BarList
                items={summary.mostActiveUsers.map((item) => ({
                  label: item.user.email,
                  value: item.totalActivity,
                }))}
              />
            </section>

            <section className="panel">
              <h2>High-priority pending items</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.highPriorityPendingItems.map((document) => (
                    <tr key={document.id}>
                      <td>{document.referenceNumber}</td>
                      <td>{document.title}</td>
                      <td>{document.currentDepartment?.name ?? 'n/a'}</td>
                      <td>{document.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : null}
      </section>
    </AuthRequired>
  );
}

export function ReportTablePage({
  columns,
  description,
  endpoint,
  exportPath,
  title,
}: ReportTableConfig) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    departmentId: '',
    documentType: '',
    priority: '',
    status: '',
    userId: '',
    workflowId: '',
  });
  const [rows, setRows] = useState<ReportTableRow[]>([]);
  const [message, setMessage] = useState('Loading...');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
  }, [filters]);

  async function load() {
    try {
      const response = await apiFetch<
        ReportList<ReportTableRow> | ReportTableRow[]
      >(`${endpoint}${query}`);
      setRows(
        Array.isArray(response.data) ? response.data : response.data.items,
      );
      setMessage('Loaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Load failed');
    }
  }

  useEffect(() => {
    void load();
  }, [query]);

  async function downloadCsv() {
    if (!exportPath) return;
    try {
      await exportCsv(
        `${exportPath}${query}`,
        `${title.toLowerCase().replaceAll(' ', '-')}.csv`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CSV export failed');
    }
  }

  return (
    <AuthRequired>
      <section className="stack">
        <div className="hero">
          <p className="eyebrow">Sprint 5</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <section className="panel stack">
          <h2>Filters</h2>
          <div className="form-grid">
            <label>
              Date from
              <input
                onChange={(event) =>
                  setFilters({ ...filters, dateFrom: event.target.value })
                }
                type="date"
                value={filters.dateFrom}
              />
            </label>
            <label>
              Date to
              <input
                onChange={(event) =>
                  setFilters({ ...filters, dateTo: event.target.value })
                }
                type="date"
                value={filters.dateTo}
              />
            </label>
            <label>
              Status
              <input
                onChange={(event) =>
                  setFilters({ ...filters, status: event.target.value })
                }
                placeholder="SUBMITTED, COMPLETED, etc."
                value={filters.status}
              />
            </label>
            <label>
              Priority
              <select
                onChange={(event) =>
                  setFilters({ ...filters, priority: event.target.value })
                }
                value={filters.priority}
              >
                <option value="">Any priority</option>
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </label>
            <label>
              Department ID
              <input
                onChange={(event) =>
                  setFilters({ ...filters, departmentId: event.target.value })
                }
                placeholder="UUID"
                value={filters.departmentId}
              />
            </label>
            <label>
              User ID
              <input
                onChange={(event) =>
                  setFilters({ ...filters, userId: event.target.value })
                }
                placeholder="UUID"
                value={filters.userId}
              />
            </label>
            <label>
              Document type
              <input
                onChange={(event) =>
                  setFilters({ ...filters, documentType: event.target.value })
                }
                placeholder="Memo, Purchase Request"
                value={filters.documentType}
              />
            </label>
            <label>
              Workflow ID
              <input
                onChange={(event) =>
                  setFilters({ ...filters, workflowId: event.target.value })
                }
                placeholder="UUID"
                value={filters.workflowId}
              />
            </label>
          </div>
          <div className="actions">
            <button onClick={load} type="button">
              Apply filters
            </button>
            {exportPath ? (
              <button className="secondary" onClick={downloadCsv} type="button">
                Export CSV
              </button>
            ) : null}
          </div>
          <p>{message}</p>
        </section>

        <section className="cards">
          <Metric label="Rows" value={rows.length} />
          <Metric label="Visible Columns" value={columns.length} />
          <Metric label="Exports" value={exportPath ? 1 : 0} />
        </section>

        <section className="panel">
          {rows.length === 0 ? (
            <p>No report data matched the current filters.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ? String(row.id) : index}>
                    {columns.map((column) => (
                      <td key={column.key}>{formatCell(row[column.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </section>
    </AuthRequired>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <span>{value}</span>
      <strong>{label}</strong>
    </div>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="stack">
      {items.map((item) => (
        <div className="report-bar" key={item.label}>
          <strong>{item.label}</strong>
          <span style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (typeof object.name === 'string') return object.name;
    if (typeof object.email === 'string') return object.email;
    if (typeof object.referenceNumber === 'string') {
      return object.referenceNumber;
    }
    return JSON.stringify(object);
  }
  return String(value);
}
