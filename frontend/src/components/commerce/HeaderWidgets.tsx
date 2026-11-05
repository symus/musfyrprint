"use client";

import { ShoppingBag, UserRound } from "lucide-react";

import { Link, useI18n } from "@/i18n/client";
import { plural } from "@/i18n/format";
import { useCart } from "./cart-client";

export function HeaderCart() {
  const { t, locale, intl } = useI18n();
  const { cart } = useCart(locale);
  const count = cart?.itemCount ?? 0;
  return (
    <Link href="/cart" className="relative rounded-full p-2 hover:bg-cloud" aria-label={`${t.cart.open}: ${plural(intl, count, t.cart.items)}`}>
      <ShoppingBag size={22} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-bold text-white" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function HeaderAccount() {
  const { t } = useI18n();
  return (
    <Link href="/account" className="rounded-full p-2 hover:bg-cloud" aria-label={t.nav.account} title={t.nav.account}>
      <UserRound size={22} aria-hidden="true" />
    </Link>
  );
}
