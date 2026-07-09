'use client';

import Link from 'next/link';
import { useState } from 'react';

import { apiBaseUrl, apiHealth, webHealth } from '../lib/api-client';

export default function HealthCheckPage() {
  const [result, setResult] = useState('Not checked yet.');

  async function runChecks() {
    setResult('Checking...');
    try {
      const [api, web] = await Promise.all([apiHealth(), webHealth()]);
      setResult(JSON.stringify({ api, web }, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Health check failed');
    }
  }

  return (
    <section className="stack">
      <div className="hero">
        <p className="eyebrow">Runtime</p>
        <h1>Health Check</h1>
        <p>Verify web/API health and jump to supporting tools.</p>
      </div>
      <div className="panel stack">
        <div className="actions">
          <button type="button" onClick={runChecks}>
            Run Browser Health Checks
          </button>
          <Link
            className="button secondary"
            href={`${apiBaseUrl}/api/docs`}
            target="_blank"
          >
            Swagger
          </Link>
          <Link
            className="button secondary"
            href="http://localhost:8025"
            target="_blank"
          >
            Mailpit
          </Link>
        </div>
        <pre>{result}</pre>
      </div>
    </section>
  );
}
