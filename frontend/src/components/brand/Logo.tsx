import { brand } from "@/config/brand";

/**
 * Original logo concept: a tilted sticker badge carrying a tee silhouette, with a peeled sun-yellow corner
 * (apparel + stickers in one mark), followed by the wordmark. Replace via docs/BRANDING.md.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="var(--color-coral)" transform="rotate(-6 32 32)" />
      <path d="M20 24l7-4h10l7 4-3 7-4-2v15H27V29l-4 2z" fill="var(--color-paper)" />
      <path d="M44 44c4 0 9 3 11 8l-12-1z" fill="var(--color-sun)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  const [first, ...rest] = brand.name.split(" ");
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className="font-display text-xl font-extrabold leading-none tracking-tight">
        {first}
        {rest.length > 0 && (
          <span className="ml-1 rounded-full bg-ink px-2 py-0.5 align-middle text-xs font-bold uppercase tracking-widest text-paper">
            {rest.join(" ")}
          </span>
        )}
      </span>
    </span>
  );
}
