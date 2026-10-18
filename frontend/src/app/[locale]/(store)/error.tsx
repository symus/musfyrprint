"use client";

import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { useI18n } from "@/i18n/client";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="container-page py-16">
      <ErrorPanel />
      <div className="mt-6 text-center">
        <button type="button" className="btn btn-primary" onClick={reset}>{t.common.tryAgain}</button>
      </div>
    </div>
  );
}
