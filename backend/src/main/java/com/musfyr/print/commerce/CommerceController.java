package com.musfyr.print.commerce;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.musfyr.print.common.i18n.ContentLanguage;
import com.musfyr.print.common.web.CurrentUser;
import com.musfyr.print.config.AppProperties;
import com.musfyr.print.payments.PaymentService;

@RestController
@Tag(name = "Cart, checkout & orders")
@Validated
public class CommerceController {

    public static final String CART_COOKIE = "mp_cart";

    private final CartService carts;
    private final CheckoutService checkout;
    private final OrderService orders;
    private final ContentLanguage language;
    private final AppProperties.Security security;

    public CommerceController(CartService carts, CheckoutService checkout, OrderService orders, ContentLanguage language,
                              AppProperties props) {
        this.carts = carts;
        this.checkout = checkout;
        this.orders = orders;
        this.language = language;
        this.security = props.security();
    }

    public static UUID cookieCartPublic(HttpServletRequest req) {
        return cookieCart(req);
    }

    static UUID cookieCart(HttpServletRequest req) {
        if (req.getCookies() == null) {
            return null;
        }
        for (Cookie c : req.getCookies()) {
            if (CART_COOKIE.equals(c.getName())) {
                try {
                    return UUID.fromString(c.getValue());
                } catch (IllegalArgumentException e) {
                    return null;
                }
            }
        }
        return null;
    }

    private void rememberCart(HttpServletResponse res, UUID cartId) {
        res.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(CART_COOKIE, cartId.toString()).httpOnly(true)
                .secure(security.cookieSecure()).sameSite(security.cookieSameSite()).path("/").maxAge(Duration.ofDays(30)).build().toString());
    }

    private UUID existingCart(HttpServletRequest req) {
        return carts.find(cookieCart(req), CurrentUser.idOrNull());
    }

    private UUID cartForWrite(HttpServletRequest req, HttpServletResponse res) {
        UUID userId = CurrentUser.idOrNull();
        UUID id = carts.findOrCreate(cookieCart(req), userId);
        if (userId == null) {
            rememberCart(res, id);
        }
        return id;
    }

    // ------------------------------------------------------------------------------------------------ cart

    @GetMapping("/api/v1/cart")
    @Operation(summary = "Current cart with server-calculated prices", description = "Optional ?shippingMethod=INPOST_LOCKER adds delivery to the totals.")
    public CartService.CartView cart(HttpServletRequest req, @RequestParam(required = false) @Size(max = 40) String shippingMethod) {
        return carts.view(existingCart(req), shippingMethod, language.current());
    }

    @PostMapping("/api/v1/cart/items")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a product (optionally with a saved design) to the cart")
    public CartService.CartView add(HttpServletRequest req, HttpServletResponse res, @Valid @RequestBody CartService.AddItemRequest body) {
        UUID cartId = cartForWrite(req, res);
        carts.add(cartId, body, language.current());
        return carts.view(cartId, null, language.current());
    }

    public record QuantityRequest(@Min(1) @Max(10000) int quantity) {
    }

    @PutMapping("/api/v1/cart/items/{itemId}")
    public CartService.CartView setQuantity(HttpServletRequest req, HttpServletResponse res, @PathVariable UUID itemId,
                                            @Valid @RequestBody QuantityRequest body) {
        UUID cartId = cartForWrite(req, res);
        carts.setQuantity(cartId, itemId, body.quantity());
        return carts.view(cartId, null, language.current());
    }

    @DeleteMapping("/api/v1/cart/items/{itemId}")
    public CartService.CartView remove(HttpServletRequest req, HttpServletResponse res, @PathVariable UUID itemId) {
        UUID cartId = cartForWrite(req, res);
        carts.remove(cartId, itemId);
        return carts.view(cartId, null, language.current());
    }

    public record PromotionRequest(@Size(max = 40) @Pattern(regexp = "^[A-Za-z0-9_-]*$") String code) {
    }

    @PutMapping("/api/v1/cart/promotion")
    @Operation(summary = "Apply (or clear with an empty code) a discount code")
    public CartService.CartView promotion(HttpServletRequest req, HttpServletResponse res, @Valid @RequestBody PromotionRequest body) {
        UUID cartId = cartForWrite(req, res);
        carts.setPromotion(cartId, body.code());
        return carts.view(cartId, null, language.current());
    }

    // ------------------------------------------------------------------------------------------------ checkout

    @PostMapping("/api/v1/checkout")
    @Operation(summary = "Place the order and get the Przelewy24 payment page",
            description = "Send an Idempotency-Key header (e.g. a UUID per checkout attempt) so retries never create a second order.")
    public CheckoutService.CheckoutResult placeOrder(HttpServletRequest req,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) @Size(max = 100) String idempotencyKey,
                                                     @Valid @RequestBody CheckoutService.CheckoutRequest body) {
        return checkout.checkout(existingCart(req), CurrentUser.idOrNull(), body, idempotencyKey);
    }

    @GetMapping("/api/v1/orders/{number}")
    @Operation(summary = "Order status for the secret order link (guest) – ?token=…")
    public OrderService.OrderView guestOrder(@PathVariable @Pattern(regexp = "^MP-[0-9]{1,12}$") String number,
                                             @RequestParam(required = false) String token) {
        UUID userId = CurrentUser.idOrNull();
        if (token == null && userId != null) {
            return orders.forCustomer(number, userId);
        }
        return orders.forGuest(number, token);
    }

    public record PayRequest(String token) {
    }

    @PostMapping("/api/v1/orders/{number}/pay")
    @Operation(summary = "Start a new payment attempt for an unpaid order")
    public PaymentService.Redirect pay(@PathVariable @Pattern(regexp = "^MP-[0-9]{1,12}$") String number, @RequestBody(required = false) PayRequest body) {
        return checkout.retryPayment(number, body == null ? null : body.token(), CurrentUser.idOrNull());
    }

    @GetMapping("/api/v1/account/orders")
    public List<OrderService.OrderSummary> myOrders() {
        return orders.customerOrders(CurrentUser.require());
    }

    @GetMapping("/api/v1/account/orders/{number}")
    public OrderService.OrderView myOrder(@PathVariable @Pattern(regexp = "^MP-[0-9]{1,12}$") String number) {
        return orders.forCustomer(number, CurrentUser.require());
    }
}
