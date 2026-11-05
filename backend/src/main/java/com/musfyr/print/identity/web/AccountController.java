package com.musfyr.print.identity.web;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.commerce.CartService;
import com.musfyr.print.common.web.CurrentUser;
import com.musfyr.print.identity.domain.User;
import com.musfyr.print.identity.service.AccountService;
import com.musfyr.print.identity.service.AuthCookies;
import com.musfyr.print.identity.service.TokenService;

@RestController
@Tag(name = "Customer accounts")
public class AccountController {

    private final AccountService accounts;
    private final TokenService tokens;
    private final AuthCookies cookies;
    private final CartService carts;

    public AccountController(AccountService accounts, TokenService tokens, AuthCookies cookies, CartService carts) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.cookies = cookies;
        this.carts = carts;
    }

    @PostMapping("/api/v1/auth/register")
    @Operation(summary = "Create a customer account (signs in and sends a verification e-mail)")
    public ResponseEntity<AuthController.SessionResponse> register(@Valid @RequestBody AccountService.RegisterRequest req, HttpServletRequest http) {
        User user = accounts.register(req);
        carts.mergeOnLogin(com.musfyr.print.commerce.CommerceController.cookieCartPublic(http), user.getId());
        TokenService.IssuedToken token = tokens.issueAccessToken(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookies.accessToken(token.value(), token.expiresAt()).toString())
                .body(AuthController.SessionResponse.of(user, token.expiresAt()));
    }

    public record TokenRequest(@NotBlank @Size(max = 200) String token) {
    }

    @PostMapping("/api/v1/auth/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@Valid @RequestBody TokenRequest req) {
        accounts.verifyEmail(req.token());
    }

    @PostMapping("/api/v1/account/verify-email/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resend() {
        accounts.resendVerification(CurrentUser.require());
    }

    public record ResetRequest(@NotBlank @Email @Size(max = 255) String email, @Pattern(regexp = "^(pl|en)$") String locale) {
    }

    @PostMapping("/api/v1/auth/password-reset/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Send a password reset link (always answers 202)")
    public void requestReset(@Valid @RequestBody ResetRequest req) {
        accounts.requestPasswordReset(req.email(), req.locale());
    }

    public record ResetConfirm(@NotBlank @Size(max = 200) String token, @NotBlank @Size(max = 200) String password) {
    }

    @PostMapping("/api/v1/auth/password-reset/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmReset(@Valid @RequestBody ResetConfirm req) {
        accounts.resetPassword(req.token(), req.password());
    }

    @GetMapping("/api/v1/account/profile")
    public AccountService.Profile profile() {
        return accounts.profile(CurrentUser.require());
    }

    @PutMapping("/api/v1/account/profile")
    public AccountService.Profile updateProfile(@Valid @RequestBody AccountService.ProfileUpdate update) {
        return accounts.updateProfile(CurrentUser.require(), update);
    }

    @PostMapping("/api/v1/account/deletion-request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void deletion() {
        accounts.requestDeletion(CurrentUser.require());
    }

    @GetMapping("/api/v1/account/addresses")
    public List<AccountService.AddressView> addresses() {
        return accounts.addresses(CurrentUser.require());
    }

    @PostMapping("/api/v1/account/addresses")
    public List<AccountService.AddressView> addAddress(@Valid @RequestBody AccountService.AddressInput a) {
        return accounts.saveAddress(CurrentUser.require(), null, a);
    }

    @PutMapping("/api/v1/account/addresses/{id}")
    public List<AccountService.AddressView> updateAddress(@PathVariable UUID id, @Valid @RequestBody AccountService.AddressInput a) {
        return accounts.saveAddress(CurrentUser.require(), id, a);
    }

    @DeleteMapping("/api/v1/account/addresses/{id}")
    public List<AccountService.AddressView> deleteAddress(@PathVariable UUID id) {
        return accounts.deleteAddress(CurrentUser.require(), id);
    }
}
