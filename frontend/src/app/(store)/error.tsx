"use client";

import { ErrorPanel } from "@/components/ui/ErrorPanel";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-16">
      <ErrorPanel />
      <div className="mt-6 text-center">
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
