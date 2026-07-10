import { Injectable, Logger } from '@nestjs/common';
import { connect } from 'node:net';

export type EmailPayload = {
  html?: string;
  subject: string;
  text: string;
  to: string | string[];
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  get configured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
  }

  async send(payload: EmailPayload): Promise<{ skipped: boolean }> {
    if (!this.configured) {
      this.logger.debug('SMTP is not configured; email notification skipped');
      return { skipped: true };
    }

    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    if (recipients.length === 0) return { skipped: true };

    try {
      await this.sendRaw({
        from: process.env.SMTP_FROM ?? 'FaithOS <no-reply@faithos.local>',
        host: process.env.SMTP_HOST as string,
        message: this.buildMessage(payload, recipients),
        port: Number.parseInt(process.env.SMTP_PORT as string, 10),
        recipients,
      });
      return { skipped: false };
    } catch (error) {
      this.logger.warn(
        `Email notification failed: ${
          error instanceof Error ? error.message : 'Unknown SMTP error'
        }`,
      );
      return { skipped: true };
    }
  }

  async sendNotification(input: {
    documentReference?: string | null | undefined;
    message: string;
    title: string;
    to: string | string[];
    type: string;
  }): Promise<{ skipped: boolean }> {
    const subject = `[FaithOS] ${input.title}`;
    const reference = input.documentReference
      ? `\nDocument: ${input.documentReference}`
      : '';
    const text = `${input.title}\n\n${input.message}${reference}\n\nType: ${input.type}\n\nOpen FaithOS to review the item.`;

    return this.send({
      subject,
      text,
      to: input.to,
    });
  }

  buildMessage(payload: EmailPayload, recipients: string[]): string {
    const headers = [
      `From: ${process.env.SMTP_FROM ?? 'FaithOS <no-reply@faithos.local>'}`,
      `To: ${recipients.join(', ')}`,
      `Subject: ${this.escapeHeader(payload.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
    ];

    return `${headers.join('\r\n')}\r\n\r\n${payload.text.replace(
      /\n/g,
      '\r\n',
    )}`;
  }

  private sendRaw(input: {
    from: string;
    host: string;
    message: string;
    port: number;
    recipients: string[];
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = connect(input.port, input.host);
      const commands = [
        'HELO faithos.local',
        `MAIL FROM:<${this.extractAddress(input.from)}>`,
        ...input.recipients.map(
          (recipient) => `RCPT TO:<${this.extractAddress(recipient)}>`,
        ),
        'DATA',
        `${input.message}\r\n.`,
        'QUIT',
      ];
      let index = 0;
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(error);
      };

      socket.setTimeout(5_000, () => fail(new Error('SMTP timeout')));
      socket.on('error', fail);
      socket.on('data', (buffer) => {
        const response = buffer.toString('utf8');
        const code = Number.parseInt(response.slice(0, 3), 10);
        if (Number.isNaN(code) || code >= 400) {
          fail(new Error(response.trim()));
          return;
        }

        if (index < commands.length) {
          socket.write(`${commands[index]}\r\n`);
          index += 1;
          return;
        }

        if (!settled) {
          settled = true;
          socket.end();
          resolve();
        }
      });
    });
  }

  private escapeHeader(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').trim();
  }

  private extractAddress(value: string): string {
    const match = value.match(/<([^>]+)>/);
    return (match?.[1] ?? value).trim();
  }
}
