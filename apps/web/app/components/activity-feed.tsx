import Link from 'next/link';

export type ActivityFeedItem = {
  actor?:
    | { firstName?: string; lastName?: string; email?: string }
    | null
    | undefined;
  actorDepartment?: { name: string } | null | undefined;
  comments?: string | null | undefined;
  createdAt: string;
  document?:
    { id: string; referenceNumber: string; title: string } | null | undefined;
  id: string;
  label: string;
};

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  if (items.length === 0) {
    return <p>No activity has been recorded yet.</p>;
  }

  return (
    <ul className="timeline">
      {items.map((item) => (
        <li key={item.id}>
          <strong>{item.label}</strong>
          {item.document ? (
            <>
              {' '}
              ·{' '}
              <Link href={`/documents/${item.document.id}`}>
                {item.document.referenceNumber}
              </Link>
            </>
          ) : null}
          <br />
          <small>
            {actorName(item.actor)}
            {item.actorDepartment
              ? ` · ${item.actorDepartment.name}`
              : ''} · {new Date(item.createdAt).toLocaleString()}
          </small>
          {item.comments ? <p>{item.comments}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function actorName(item?: ActivityFeedItem['actor']) {
  if (!item) return 'System';
  const name = [item.firstName, item.lastName].filter(Boolean).join(' ');
  return name || item.email || 'System';
}
