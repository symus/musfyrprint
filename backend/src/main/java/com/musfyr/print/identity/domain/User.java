package com.musfyr.print.identity.domain;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import com.musfyr.print.common.domain.TimestampedEntity;

@Entity
@Table(name = "users")
public class User extends TimestampedEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "failed_logins", nullable = false)
    private int failedLogins;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = EnumSet.noneOf(Role.class);

    protected User() {
    }

    public User(String email, String passwordHash, String displayName, Set<Role> roles) {
        this.id = UUID.randomUUID();
        this.email = email.trim().toLowerCase();
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.roles = roles.isEmpty() ? EnumSet.noneOf(Role.class) : EnumSet.copyOf(roles);
    }

    public boolean isLocked(Instant now) {
        return status == UserStatus.LOCKED || (lockedUntil != null && lockedUntil.isAfter(now));
    }

    public void registerFailedLogin(int maxAttempts, Instant lockUntil) {
        failedLogins++;
        if (failedLogins >= maxAttempts) {
            lockedUntil = lockUntil;
            failedLogins = 0;
        }
    }

    public void registerSuccessfulLogin() {
        failedLogins = 0;
        lockedUntil = null;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public UserStatus getStatus() {
        return status;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void markEmailVerified(Instant at) {
        this.emailVerifiedAt = at;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }
}
