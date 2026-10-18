package com.musfyr.print.quotes;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.musfyr.print.common.domain.TimestampedEntity;

@Entity
@Table(name = "quote_requests")
public class QuoteRequest extends TimestampedEntity {

    public enum Status { NEW, IN_REVIEW, QUOTED, WON, LOST }

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "contact_name", nullable = false)
    private String contactName;

    @Column(nullable = false)
    private String email;

    private String phone;

    private String company;

    @Column(name = "product_interest", nullable = false)
    private String productInterest;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "needed_by")
    private LocalDate neededBy;

    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.NEW;

    protected QuoteRequest() {
    }

    QuoteRequest(String reference, String contactName, String email, String phone, String company,
                 String productInterest, int quantity, LocalDate neededBy, String message) {
        this.id = UUID.randomUUID();
        this.reference = reference;
        this.contactName = contactName;
        this.email = email;
        this.phone = phone;
        this.company = company;
        this.productInterest = productInterest;
        this.quantity = quantity;
        this.neededBy = neededBy;
        this.message = message;
    }

    public UUID getId() { return id; }
    public String getReference() { return reference; }
    public String getContactName() { return contactName; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getCompany() { return company; }
    public String getProductInterest() { return productInterest; }
    public int getQuantity() { return quantity; }
    public LocalDate getNeededBy() { return neededBy; }
    public String getMessage() { return message; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}
