import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  description: 'FaithOS DocRoute internal document routing',
  title: 'FaithOS DocRoute',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar" aria-label="Primary navigation">
            <div className="brand">
              <span className="brand-mark">F</span>
              <div>
                <strong>FaithOS</strong>
                <small>DocRoute Core</small>
              </div>
            </div>
            <nav>
              <Link href="/">Dashboard</Link>
              <Link href="/uat">UAT Dashboard</Link>
              <Link href="/inbox">Inbox</Link>
              <Link href="/sent">Sent</Link>
              <Link href="/drafts">Drafts</Link>
              <Link href="/archive">Archive</Link>
              <Link href="/documents">Documents</Link>
              <Link href="/documents/create">Create Document</Link>
              <Link href="/search">Search</Link>
              <Link href="/profile">User Profile</Link>
              <Link href="/organization">Organization</Link>
              <Link href="/users">Users</Link>
              <Link href="/departments">Departments</Link>
              <Link href="/roles">Roles</Link>
              <Link href="/permissions">Permissions</Link>
              <Link href="/health-check">Health Check</Link>
              <Link href="/uat/report">UAT Report</Link>
            </nav>
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
