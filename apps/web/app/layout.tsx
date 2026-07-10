import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SidebarNav } from './components/sidebar-nav';
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
            <SidebarNav />
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
