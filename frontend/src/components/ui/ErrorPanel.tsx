export function ErrorPanel({ title = "We couldn't load this right now", message, correlationId }: {
  title?: string;
  message?: string;
  correlationId?: string;
}) {
  return (
    <div role="alert" className="card border-danger/30 bg-white p-6 text-center">
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="mt-2 text-ink-soft">{message ?? "Please refresh the page in a moment."}</p>
      {correlationId && <p className="mt-2 text-xs text-ink-soft">Reference: {correlationId}</p>}
    </div>
  );
}
