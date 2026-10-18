package com.musfyr.print.identity.web;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.filter.OncePerRequestFilter;

import com.musfyr.print.identity.service.AuthCookies;

/**
 * Authenticates browser requests from the HttpOnly session cookie.
 *
 * <p>Deliberately separate from the resource server's {@code BearerTokenResolver}: Spring Security skips CSRF
 * checks for requests whose token that resolver finds, which is correct for an Authorization header but would
 * disable CSRF protection for cookie sessions. An expired or tampered cookie is ignored, so public pages keep
 * working and protected endpoints answer 401.
 */
public class SessionCookieAuthenticationFilter extends OncePerRequestFilter {

    private final JwtDecoder jwtDecoder;
    private final Converter<Jwt, AbstractAuthenticationToken> converter;

    public SessionCookieAuthenticationFilter(JwtDecoder jwtDecoder,
                                             Converter<Jwt, AbstractAuthenticationToken> converter) {
        this.jwtDecoder = jwtDecoder;
        this.converter = converter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = sessionCookie(request);
            if (token != null) {
                try {
                    AbstractAuthenticationToken authentication = converter.convert(jwtDecoder.decode(token));
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                } catch (JwtException ignored) {
                    // stale or forged cookie: continue anonymously
                }
            }
        }
        chain.doFilter(request, response);
    }

    private static String sessionCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (AuthCookies.ACCESS_TOKEN.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
