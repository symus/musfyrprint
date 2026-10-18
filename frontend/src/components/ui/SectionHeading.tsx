import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({ eyebrow, title, description, href, linkLabel = "View all" }: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-3xl font-extrabold sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 text-ink-soft">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 font-semibold text-violet hover:underline">
          {linkLabel} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
