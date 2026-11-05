package com.musfyr.print.common.web;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public final class CurrentUser {

    private CurrentUser() {
    }

    /** The signed-in user's id, or null for anonymous visitors. */
    public static UUID idOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof Jwt jwt ? UUID.fromString(jwt.getSubject()) : null;
    }

    public static UUID require() {
        UUID id = idOrNull();
        if (id == null) {
            throw new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException("Sign in required");
        }
        return id;
    }
}
