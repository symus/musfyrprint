package com.musfyr.print.identity.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.common.error.ApiExceptionHandler;
import com.musfyr.print.identity.domain.User;
import com.musfyr.print.identity.service.AuthCookies;
import com.musfyr.print.identity.service.AuthService;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final AuthCookies cookies;

    public AuthController(AuthService authService, AuthCookies cookies) {
        this.authService = authService;
        this.cookies = cookies;
    }

    @GetMapping("/csrf")
    @Operation(summary = "Issue the XSRF-TOKEN cookie", description = "Call once before the first unsafe request.")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    @PostMapping("/login")
    @Operation(summary = "Log in with e-mail and password", description = "Sets an HttpOnly session cookie.")
    public ResponseEntity<SessionResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request.email(), request.password());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE,
                        cookies.accessToken(result.token().value(), result.token().expiresAt()).toString())
                .body(SessionResponse.of(result.user(), result.token().expiresAt()));
    }

    @PostMapping("/logout")
    @Operation(summary = "Log out (clears the session cookie)")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccessToken().toString())
                .build();
    }

    @GetMapping("/me")
    @Operation(summary = "Current session")
    public SessionResponse me(@AuthenticationPrincipal Jwt jwt) {
        return new SessionResponse(new UserView(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name"), jwt.getClaimAsStringList("roles")), jwt.getExpiresAt());
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<?> badCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiExceptionHandler.problem(HttpStatus.UNAUTHORIZED, "Invalid Credentials", ex.getMessage()));
    }

    @ExceptionHandler(LockedException.class)
    ResponseEntity<?> locked(LockedException ex) {
        return ResponseEntity.status(HttpStatus.LOCKED)
                .body(ApiExceptionHandler.problem(HttpStatus.LOCKED, "Account Locked", ex.getMessage()));
    }

    public record LoginRequest(@NotBlank @Email @Size(max = 255) String email,
                               @NotBlank @Size(max = 200) String password) {
    }

    public record CsrfResponse(String headerName, String token) {
    }

    public record UserView(UUID id, String email, String displayName, List<String> roles) {
    }

    public record SessionResponse(UserView user, Instant expiresAt) {
        static SessionResponse of(User user, Instant expiresAt) {
            return new SessionResponse(new UserView(user.getId(), user.getEmail(), user.getDisplayName(),
                    user.getRoles().stream().map(Enum::name).sorted().toList()), expiresAt);
        }
    }
}
