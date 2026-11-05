package com.musfyr.print.payments;

/** Transaction status notification POSTed by Przelewy24 to urlStatus. */
public record P24Notification(int merchantId, int posId, String sessionId, long amount, long originAmount,
                              String currency, long orderId, int methodId, String statement, String sign) {
}
