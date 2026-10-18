package com.musfyr.print.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.musfyr.print.audit.AuditService;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.config.AppProperties;
import com.musfyr.print.identity.domain.Role;
import com.musfyr.print.identity.domain.User;
import com.musfyr.print.identity.domain.UserRepository;
import com.musfyr.print.identity.service.AuthService;
import com.musfyr.print.identity.service.TokenService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository users;
    @Mock TokenService tokens;
    @Mock AuditService audit;

    PasswordEncoder encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    AuthService service;
    User user;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties(null, null, new AppProperties.Security("x".repeat(40), "test",
                Duration.ofHours(1), false, "Lax", List.of(), 3, Duration.ofMinutes(15)), null);
        service = new AuthService(users, encoder, tokens, new RateLimiter(), audit, props,
                Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
        user = new User("Jan@Example.com", encoder.encode("correct-horse"), "Jan", EnumSet.of(Role.CUSTOMER));
    }

    @Test
    void normalisesEmailOnCreation() {
        assertThat(user.getEmail()).isEqualTo("jan@example.com");
    }

    @Test
    void unknownEmailAndWrongPasswordShareTheSameError() {
        when(users.findByEmailIgnoreCase("ghost@example.com")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("jan@example.com")).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> service.login("ghost@example.com", "x"))
                .isInstanceOf(BadCredentialsException.class).hasMessage("Invalid email or password");
        assertThatThrownBy(() -> service.login("jan@example.com", "wrong"))
                .isInstanceOf(BadCredentialsException.class).hasMessage("Invalid email or password");
    }

    @Test
    void locksAccountAfterRepeatedFailures() {
        when(users.findByEmailIgnoreCase("jan@example.com")).thenReturn(Optional.of(user));
        for (int i = 0; i < 3; i++) {
            assertThatThrownBy(() -> service.login("jan@example.com", "wrong"))
                    .isInstanceOf(BadCredentialsException.class);
        }
        assertThatThrownBy(() -> service.login("jan@example.com", "correct-horse"))
                .isInstanceOf(LockedException.class);
    }

    @Test
    void successfulLoginIssuesToken() {
        when(users.findByEmailIgnoreCase("jan@example.com")).thenReturn(Optional.of(user));
        when(tokens.issueAccessToken(user)).thenReturn(new TokenService.IssuedToken("t", Instant.now()));
        assertThat(service.login(" JAN@example.com ", "correct-horse").token().value()).isEqualTo("t");
    }
}
