package com.musfyr.print.identity.service;

import java.time.Duration;
import java.time.Instant;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.musfyr.print.config.AppProperties;

@Component
public class AuthCookies {

    public static final String ACCESS_TOKEN = "mp_at";

    private final AppProperties.Security security;

    public AuthCookies(AppProperties props) {
        this.security = props.security();
    }

    public ResponseCookie accessToken(String token, Instant expiresAt) {
        return base(token).maxAge(Duration.between(Instant.now(), expiresAt)).build();
    }

    public ResponseCookie clearAccessToken() {
        return base("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(ACCESS_TOKEN, value)
                .httpOnly(true)
                .secure(security.cookieSecure())
                .sameSite(security.cookieSameSite())
                .path("/");
    }
}
