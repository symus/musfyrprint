package com.musfyr.print.common.web;

/** Monetary amount in minor units (e.g. grosze) with ISO-4217 currency. Never use floating point for money. */
public record Money(long amountMinor, String currency) {
}
