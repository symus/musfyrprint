package com.musfyr.print.notify;

/** Sends transactional e-mail. Implementations must never throw into business transactions. */
public interface Notifier {

    record Email(String to, String subject, String text, String html) {
    }

    /** @return true if the message was handed to a mail server */
    boolean send(Email email);
}
