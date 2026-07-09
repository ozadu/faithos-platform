export function Status({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: 'good' | 'neutral' | 'warn';
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
