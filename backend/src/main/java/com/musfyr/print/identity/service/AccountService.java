package com.musfyr.print.identity.service;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.commerce.ShopProperties;
import com.musfyr.print.commerce.Tokens;
import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.ConflictException;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.common.web.RequestContext;
import com.musfyr.print.identity.domain.Role;
import com.musfyr.print.identity.domain.User;
import com.musfyr.print.identity.domain.UserRepository;
import com.musfyr.print.notify.Emails;
import com.musfyr.print.notify.Notifier;

/** Customer self-service: registration, e-mail verification, password reset, profile and addresses. */
@Service
public class AccountService {

    static final Duration VERIFY_TTL = Duration.ofHours(24);
    static final Duration RESET_TTL = Duration.ofHours(1);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JdbcClient jdbc;
    private final Notifier notifier;
    private final Emails emails;
    private final ShopProperties shop;
    private final RateLimiter rateLimiter;
    private final AuditService audit;

    public AccountService(UserRepository users, PasswordEncoder encoder, JdbcClient jdbc, Notifier notifier, Emails emails,
                          ShopProperties shop, RateLimiter rateLimiter, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.jdbc = jdbc;
        this.notifier = notifier;
        this.emails = emails;
        this.shop = shop;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
    }

    public static final String PASSWORD_RULE = "^(?=.*[A-Za-z])(?=.*[0-9]).{10,200}$";

    public record RegisterRequest(@NotBlank @Email @Size(max = 255) String email,
                                  @NotBlank @Pattern(regexp = PASSWORD_RULE, message = "Use at least 10 characters with letters and digits") String password,
                                  @NotBlank @Size(max = 120) String displayName,
                                  boolean acceptTerms, boolean marketingOptIn,
                                  @Pattern(regexp = "^(pl|en)$") String locale) {
        @AssertTrue(message = "Please accept the terms of sale")
        public boolean isTermsAccepted() {
            return acceptTerms;
        }
    }

    @Transactional
    public User register(RegisterRequest req) {
        rateLimiter.check("register", RequestContext.clientIp(), 10, Duration.ofHours(1));
        String email = req.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ConflictException("An account with this e-mail already exists. Sign in or reset your password.");
        }
        User user = users.save(new User(email, encoder.encode(req.password()), req.displayName().trim(), EnumSet.of(Role.CUSTOMER)));
        users.flush();
        String locale = req.locale() == null ? "pl" : req.locale();
        jdbc.sql("UPDATE users SET marketing_opt_in = :m, preferred_locale = :l, terms_accepted_at = now() WHERE id = :id")
                .param("m", req.marketingOptIn()).param("l", locale).param("id", user.getId()).update();
        sendVerification(user.getId(), email, locale);
        audit.recordAs(user.getId(), email, "ACCOUNT_REGISTERED", "User", user.getId().toString(), null);
        return user;
    }

    @Transactional
    public void resendVerification(UUID userId) {
        rateLimiter.check("verify-resend", userId.toString(), 5, Duration.ofHours(1));
        record U(String email, String locale, Instant verified) {
        }
        U u = jdbc.sql("SELECT email, preferred_locale, email_verified_at FROM users WHERE id = :id").param("id", userId)
                .query((rs, i) -> new U(rs.getString(1), rs.getString(2), rs.getTimestamp(3) == null ? null : rs.getTimestamp(3).toInstant())).single();
        if (u.verified() == null) {
            sendVerification(userId, u.email(), u.locale());
        }
    }

    private void sendVerification(UUID userId, String email, String locale) {
        String token = issue(userId, "VERIFY_EMAIL", VERIFY_TTL);
        String link = shop.publicSiteUrl() + "/" + (locale == null ? "pl" : locale) + "/account/verify?token=" + token;
        afterCommit(() -> notifier.send(emails.verifyEmail(email, locale, link)));
    }

    @Transactional
    public void verifyEmail(String token) {
        UUID userId = consume(token, "VERIFY_EMAIL");
        jdbc.sql("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = :id")
                .param("id", userId).update();
    }

    /** Always succeeds from the caller's point of view, so it cannot reveal which e-mails have accounts. */
    @Transactional
    public void requestPasswordReset(String email, String locale) {
        rateLimiter.check("reset-ip", RequestContext.clientIp(), 10, Duration.ofHours(1));
        rateLimiter.check("reset-email", email.trim().toLowerCase(), 3, Duration.ofHours(1));
        users.findByEmailIgnoreCase(email.trim().toLowerCase()).ifPresent(user -> {
            String token = issue(user.getId(), "RESET_PASSWORD", RESET_TTL);
            String lang = locale == null ? "pl" : locale;
            String link = shop.publicSiteUrl() + "/" + lang + "/account/reset-password?token=" + token;
            afterCommit(() -> notifier.send(emails.passwordReset(user.getEmail(), lang, link)));
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (newPassword == null || !newPassword.matches(PASSWORD_RULE)) {
            throw new BusinessRuleException("Use at least 10 characters with letters and digits");
        }
        UUID userId = consume(token, "RESET_PASSWORD");
        jdbc.sql("""
                UPDATE users SET password_hash = :h, failed_logins = 0, locked_until = NULL,
                       email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = :id""")
                .param("h", encoder.encode(newPassword)).param("id", userId).update();
        // A used reset link also invalidates any other outstanding reset links.
        jdbc.sql("UPDATE email_tokens SET used_at = now() WHERE user_id = :id AND purpose = 'RESET_PASSWORD' AND used_at IS NULL")
                .param("id", userId).update();
        audit.recordAs(userId, null, "PASSWORD_RESET", "User", userId.toString(), null);
    }

    private String issue(UUID userId, String purpose, Duration ttl) {
        String token = Tokens.random(32);
        jdbc.sql("INSERT INTO email_tokens (id, user_id, purpose, token_hash, expires_at) VALUES (:id, :u, :p, :h, :e)")
                .param("id", UUID.randomUUID()).param("u", userId).param("p", purpose).param("h", Tokens.hash(token))
                .param("e", java.sql.Timestamp.from(Instant.now().plus(ttl))).update();
        return token;
    }

    private UUID consume(String token, String purpose) {
        if (token == null || token.isBlank()) {
            throw new BusinessRuleException("This link is invalid or has expired");
        }
        UUID userId = jdbc.sql("""
                UPDATE email_tokens SET used_at = now()
                WHERE token_hash = :h AND purpose = :p AND used_at IS NULL AND expires_at > now() RETURNING user_id""")
                .param("h", Tokens.hash(token)).param("p", purpose).query(UUID.class).optional().orElse(null);
        if (userId == null) {
            throw new BusinessRuleException("This link is invalid or has expired");
        }
        return userId;
    }

    // ------------------------------------------------------------------------------------------- profile

    public record Profile(UUID id, String email, String displayName, String phone, boolean emailVerified, boolean marketingOptIn,
                          String preferredSizeSystem, String preferredLocale, boolean deletionRequested, List<String> roles) {
    }

    public record ProfileUpdate(@NotBlank @Size(max = 120) String displayName,
                                @Pattern(regexp = "^$|^\\+?[0-9 ()-]{9,20}$") String phone,
                                boolean marketingOptIn,
                                @Pattern(regexp = "^$|^(EU|UK|US|CN|IN)$") String preferredSizeSystem,
                                @Pattern(regexp = "^$|^(pl|en)$") String preferredLocale) {
    }

    @Transactional(readOnly = true)
    public Profile profile(UUID userId) {
        List<String> roles = jdbc.sql("SELECT role FROM user_roles WHERE user_id = :id ORDER BY role").param("id", userId).query(String.class).list();
        return jdbc.sql("""
                SELECT id, email, display_name, phone, email_verified_at IS NOT NULL AS verified, marketing_opt_in,
                       preferred_size_system, preferred_locale, deletion_requested_at IS NOT NULL AS deletion
                FROM users WHERE id = :id""")
                .param("id", userId)
                .query((rs, i) -> new Profile(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getBoolean(5), rs.getBoolean(6), rs.getString(7), rs.getString(8), rs.getBoolean(9), roles))
                .optional().orElseThrow(() -> new NotFoundException("User", userId));
    }

    @Transactional
    public Profile updateProfile(UUID userId, ProfileUpdate u) {
        jdbc.sql("""
                UPDATE users SET display_name = :n, phone = NULLIF(:p, ''), marketing_opt_in = :m,
                       preferred_size_system = NULLIF(:s, ''), preferred_locale = NULLIF(:l, ''), updated_at = now() WHERE id = :id""")
                .param("n", u.displayName().trim()).param("p", u.phone() == null ? "" : u.phone()).param("m", u.marketingOptIn())
                .param("s", u.preferredSizeSystem() == null ? "" : u.preferredSizeSystem())
                .param("l", u.preferredLocale() == null ? "" : u.preferredLocale()).param("id", userId).update();
        return profile(userId);
    }

    /** GDPR erasure request: recorded and confirmed to the customer; processed by staff (orders must be kept for tax law). */
    @Transactional
    public void requestDeletion(UUID userId) {
        jdbc.sql("UPDATE users SET deletion_requested_at = COALESCE(deletion_requested_at, now()), status = 'PENDING_DELETION', updated_at = now() WHERE id = :id")
                .param("id", userId).update();
        audit.recordAs(userId, null, "ACCOUNT_DELETION_REQUESTED", "User", userId.toString(), null);
    }

    // ------------------------------------------------------------------------------------------- addresses

    public record AddressInput(@NotBlank @Size(max = 120) String fullName, @Size(max = 160) String company,
                               @NotBlank @Size(max = 200) String line1, @Size(max = 200) String line2,
                               @NotBlank @Pattern(regexp = "^\\d{2}-\\d{3}$", message = "Use the Polish format 00-000") String postalCode,
                               @NotBlank @Size(max = 120) String city,
                               @NotBlank @Pattern(regexp = "^PL$") String country,
                               @Pattern(regexp = "^$|^\\+?[0-9 ()-]{9,20}$") String phone,
                               boolean isDefault) {
    }

    public record AddressView(UUID id, String fullName, String company, String line1, String line2, String postalCode,
                              String city, String country, String phone, boolean isDefault) {
    }

    @Transactional(readOnly = true)
    public List<AddressView> addresses(UUID userId) {
        return jdbc.sql("""
                SELECT id, full_name, company, line1, line2, postal_code, city, country, phone, is_default
                FROM customer_addresses WHERE user_id = :u ORDER BY is_default DESC, created_at""")
                .param("u", userId)
                .query((rs, i) -> new AddressView(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9), rs.getBoolean(10)))
                .list();
    }

    @Transactional
    public List<AddressView> saveAddress(UUID userId, UUID addressId, AddressInput a) {
        long count = jdbc.sql("SELECT count(*) FROM customer_addresses WHERE user_id = :u").param("u", userId).query(Long.class).single();
        if (addressId == null && count >= 20) {
            throw new BusinessRuleException("You can save up to 20 addresses");
        }
        boolean makeDefault = a.isDefault() || count == 0;
        if (makeDefault) {
            jdbc.sql("UPDATE customer_addresses SET is_default = FALSE WHERE user_id = :u").param("u", userId).update();
        }
        Map<String, Object> p = new java.util.HashMap<>(Map.of("u", userId, "n", a.fullName(), "l1", a.line1(), "pc", a.postalCode(),
                "c", a.city(), "co", a.country(), "d", makeDefault));
        p.put("cmp", a.company());
        p.put("l2", a.line2());
        p.put("ph", a.phone());
        if (addressId == null) {
            p.put("id", UUID.randomUUID());
            jdbc.sql("""
                    INSERT INTO customer_addresses (id, user_id, full_name, company, line1, line2, postal_code, city, country, phone, is_default)
                    VALUES (:id, :u, :n, :cmp, :l1, :l2, :pc, :c, :co, :ph, :d)""").params(p).update();
        } else {
            p.put("id", addressId);
            int n = jdbc.sql("""
                    UPDATE customer_addresses SET full_name = :n, company = :cmp, line1 = :l1, line2 = :l2, postal_code = :pc, city = :c,
                           country = :co, phone = :ph, is_default = :d WHERE id = :id AND user_id = :u""").params(p).update();
            if (n == 0) {
                throw new NotFoundException("Address", addressId);
            }
        }
        return addresses(userId);
    }

    @Transactional
    public List<AddressView> deleteAddress(UUID userId, UUID addressId) {
        jdbc.sql("DELETE FROM customer_addresses WHERE id = :id AND user_id = :u").param("id", addressId).param("u", userId).update();
        return addresses(userId);
    }

    private static void afterCommit(Runnable r) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    r.run();
                }
            });
        } else {
            r.run();
        }
    }
}
