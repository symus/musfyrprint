"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch, postJson } from "@/lib/api/client";
import type { Cart } from "@/lib/api/types";

const EVENT = "musfir:cart-changed";

/** Notify every cart widget on the page (header badge, cart page) that the cart changed. */
export function announceCartChange(cart?: Cart) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: cart }));
}

export async function addToCart(body: {
  variantId?: string; productSlug?: string; colorCode?: string | null; sizeCode?: string | null; quantity: number;
  options?: Record<string, string>; designId?: string; designToken?: string;
}): Promise<Cart> {
  const cart = await postJson<Cart>("/api/v1/cart/items", body);
  announceCartChange(cart);
  return cart;
}

/** Live cart for client components; refreshes when any component announces a change. */
export function useCart(locale: string, shippingMethod?: string | null) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const qs = shippingMethod ? `?shippingMethod=${encodeURIComponent(shippingMethod)}` : "";
      setCart(await apiFetch<Cart>(`/api/v1/cart${qs}`, { headers: { "Accept-Language": locale } }));
      setError(false);
    } catch {
      setError(true);
    }
  }, [locale, shippingMethod]);
  useEffect(() => {
    let active = true;
    const run = () => { if (active) void load(); };
    run();
    window.addEventListener(EVENT, run);
    return () => {
      active = false;
      window.removeEventListener(EVENT, run);
    };
  }, [load]);
  return { cart, error, reload: load, setCart };
}
