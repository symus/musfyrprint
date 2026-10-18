package com.musfyr.print.identity.service;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.musfyr.print.config.AppProperties;
import com.musfyr.print.identity.domain.User;

@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final AppProperties.Security security;

    public TokenService(JwtEncoder encoder, AppProperties props) {
        this.encoder = encoder;
        this.security = props.security();
    }

    public IssuedToken issueAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(security.accessTokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(security.jwtIssuer())
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("email", user.getEmail())
                .claim("name", user.getDisplayName())
                .claim("roles", user.getRoles().stream().map(Enum::name).sorted().toList())
                .build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }
}
