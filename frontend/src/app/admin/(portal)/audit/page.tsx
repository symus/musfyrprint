"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import type { Page } from "@/lib/api/types";
import type { AuditEntry } from "@/lib/admin-types";

export default function AuditPage() {
  const [data, setData] = useState<Page<AuditEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiFetch<Page<AuditEntry>>("/api/v1/admin/audit-logs?size=100").then(setData).catch((e) => setError(e.message));
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-extrabold">Audit log</h1>
      <p className="mt-1 text-ink-soft">Sensitive administrative actions, newest first.</p>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
            <tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Details</th></tr>
          </thead>
          <tbody>
            {data?.items.map((a) => (
              <tr key={a.id} className="border-b border-line/60 align-top">
                <td className="p-3 text-xs">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="p-3">{a.actorEmail ?? "system"}<p className="text-xs text-ink-soft">{a.ipAddress}</p></td>
                <td className="p-3 font-semibold">{a.action}</td>
                <td className="p-3 text-xs">{a.entityType}<p className="font-mono text-ink-soft">{a.entityId}</p></td>
                <td className="p-3 font-mono text-xs">{a.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
