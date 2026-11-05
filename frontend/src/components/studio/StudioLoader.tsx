"use client";

import dynamic from "next/dynamic";

import { useI18n } from "@/i18n/client";

/** The canvas editor needs the browser (canvas, fonts), so it is loaded on the client only. */
const DesignStudio = dynamic(() => import("./DesignStudio").then((m) => m.DesignStudio), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  const { t } = useI18n();
  return <p className="card p-8 text-ink-soft" aria-busy="true">{t.studio.loading}</p>;
}

export function StudioLoader(props: React.ComponentProps<typeof DesignStudio>) {
  return <DesignStudio {...props} />;
}
