package com.musfyr.print.marketing;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "newsletter_subscriptions")
public class NewsletterSubscription {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String status = "PENDING_CONFIRMATION";

    private String source;

    private String locale;

    @Column(name = "consent_text", nullable = false)
    private String consentText;

    @Column(name = "consent_at", nullable = false)
    private Instant consentAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected NewsletterSubscription() {
    }

    NewsletterSubscription(String email, String source, String locale, String consentText) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.source = source;
        this.locale = locale;
        this.consentText = consentText;
        this.consentAt = Instant.now();
        this.createdAt = consentAt;
    }

    public String getStatus() {
        return status;
    }
}
