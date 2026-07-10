import 'reflect-metadata';

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { EmailService } from '../src/email/email.service';

it('builds a simple Mailpit-friendly notification email', () => {
  const email = new EmailService();
  const message = email.buildMessage(
    {
      subject: 'Workflow task assigned',
      text: 'A workflow task requires approval.',
      to: 'admin@demo.faithos.local',
    },
    ['admin@demo.faithos.local'],
  );

  assert.match(message, /Subject: Workflow task assigned/);
  assert.match(message, /To: admin@demo.faithos.local/);
  assert.match(message, /A workflow task requires approval\./);
});

it('skips sending when SMTP is not configured', async () => {
  const oldHost = process.env.SMTP_HOST;
  const oldPort = process.env.SMTP_PORT;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;

  try {
    const email = new EmailService();
    const result = await email.send({
      subject: 'Workflow completed',
      text: 'Done',
      to: 'admin@demo.faithos.local',
    });

    assert.equal(result.skipped, true);
  } finally {
    if (oldHost) process.env.SMTP_HOST = oldHost;
    if (oldPort) process.env.SMTP_PORT = oldPort;
  }
});
