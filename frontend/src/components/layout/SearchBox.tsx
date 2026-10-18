"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import type { Suggestion } from "@/lib/api/types";
import { useI18n } from "@/i18n/client";

/** Accessible combobox with debounced, typo-tolerant suggestions from the catalogue API. */
export function SearchBox({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const { t, locale, href } = useI18n();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      try {
        const res = await fetch(`/api/v1/catalog/suggest?q=${encodeURIComponent(q)}`, {
          signal: abort.current.signal,
          headers: { "Accept-Language": locale },
        });
        if (res.ok) {
          setItems((await res.json()) as Suggestion[]);
          setOpen(true);
          setActive(-1);
        }
      } catch {
        // aborted or offline – keep previous suggestions
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query, locale]);

  // Suggestions only apply while the query is long enough; older results are hidden, not cleared.
  const visible = query.trim().length >= 2 ? items : [];

  const go = (s?: Suggestion) => {
    setOpen(false);
    if (s) router.push(href(s.type === "PRODUCT" ? `/products/${s.slug}` : `/category/${s.slug}`));
    else if (query.trim()) router.push(href(`/shop?q=${encodeURIComponent(query.trim())}&sort=RELEVANCE`));
  };

  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        go(active >= 0 ? visible[active] : undefined);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">{t.search.label}</label>
      <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={open && visible.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={t.search.placeholder}
        className="input rounded-full pl-10"
        value={query}
        maxLength={60}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => visible.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, visible.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && visible.length > 0 && (
        <ul id={listId} role="listbox" className="card absolute inset-x-0 top-full z-50 mt-2 overflow-hidden p-1">
          {visible.map((s, i) => (
            <li
              key={`${s.type}-${s.slug}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${i === active ? "bg-violet-soft" : "hover:bg-cloud"}`}
              onMouseDown={(e) => {
                e.preventDefault();
                go(s);
              }}
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-ink-soft">{s.type === "CATEGORY" ? t.search.category : s.context}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
