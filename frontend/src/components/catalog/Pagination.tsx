import { Link } from "@/i18n/client";

import { hrefWith, type SearchParams } from "@/lib/catalog-params";

export function Pagination({ pathname, searchParams, page, totalPages, label }: {
  pathname: string;
  searchParams: SearchParams;
  page: number; // zero-based
  totalPages: number;
  label: string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i).filter((i) => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1);
  return (
    <nav aria-label={label} className="mt-10 flex justify-center">
      <ul className="flex items-center gap-1">
        {pages.map((p, idx) => (
          <li key={p} className="flex items-center">
            {idx > 0 && pages[idx - 1] !== p - 1 && <span className="px-2 text-ink-soft">…</span>}
            <Link
              href={hrefWith(pathname, searchParams, { page: String(p + 1) })}
              aria-current={p === page ? "page" : undefined}
              className={`flex size-10 items-center justify-center rounded-full font-semibold ${p === page ? "bg-ink text-paper" : "hover:bg-cloud"}`}
            >
              {p + 1}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
