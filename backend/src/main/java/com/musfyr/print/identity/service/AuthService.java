package com.musfyr.print.identity.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.common.web.RequestContext;
import com.musfyr.print.config.AppProperties;
import com.musfyr.print.identity.domain.User;
import com.musfyr.print.identity.domain.UserRepository;
import com.musfyr.print.identity.domain.UserStatus;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final RateLimiter rateLimiter;
    private final AuditService audit;
    private final AppProperties.Security security;
    private final Clock clock;
    /** Hash of a random value; checked when the e-mail is unknown so response timing does not reveal accounts. */
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokens,
                       RateLimiter rateLimiter, AuditService audit, AppProperties props, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
        this.security = props.security();
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
    }

    /**
     * Verifies credentials with IP rate limiting and per-account lockout. Error messages are deliberately
     * generic so they do not reveal whether an account exists.
     */
    @Transactional(noRollbackFor = {BadCredentialsException.class, LockedException.class})
    public LoginResult login(String email, String password) {
        String normalisedEmail = email.trim().toLowerCase();
        rateLimiter.check("login-ip", RequestContext.clientIp(), 20, Duration.ofMinutes(5));
        rateLimiter.check("login-email", normalisedEmail, 10, Duration.ofMinutes(15));

        User user = users.findByEmailIgnoreCase(normalisedEmail).orElse(null);
        if (user == null || user.getPasswordHash() == null) {
            passwordEncoder.matches(password, dummyHash);
            throw new BadCredentialsException("Invalid email or password");
        }
        Instant now = clock.instant();
        if (user.getStatus() != UserStatus.ACTIVE || user.isLocked(now)) {
            throw new LockedException("Account temporarily locked. Try again later or reset your password.");
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            user.registerFailedLogin(security.maxFailedLogins(), now.plus(security.lockoutDuration()));
            log.info("Failed login for user {}", user.getId());
            throw new BadCredentialsException("Invalid email or password");
        }
        user.registerSuccessfulLogin();
        audit.recordAs(user.getId(), user.getEmail(), "AUTH_LOGIN", "User", user.getId().toString(), null);
        return new LoginResult(user, tokens.issueAccessToken(user));
    }

    public record LoginResult(User user, TokenService.IssuedToken token) {
    }
}
