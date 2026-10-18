"use client";

import { useI18n } from "@/i18n/client";

export function ErrorPanel({ title, message, correlationId }: { title?: string; message?: string; correlationId?: string }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="card border-danger/30 bg-white p-6 text-center">
      <p className="font-display text-xl font-bold">{title ?? t.common.errorTitle}</p>
      <p className="mt-2 text-ink-soft">{message ?? t.common.errorText}</p>
      {correlationId && <p className="mt-2 text-xs text-ink-soft">{t.common.reference}: {correlationId}</p>}
    </div>
  );
}
