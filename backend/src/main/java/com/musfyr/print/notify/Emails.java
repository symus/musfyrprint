package com.musfyr.print.notify;

import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import com.musfyr.print.config.AppProperties;

/** Transactional e-mail content in Polish and English. */
@Component
public class Emails {

    private final AppProperties.Brand brand;

    public Emails(AppProperties props) {
        this.brand = props.brand();
    }

    private static boolean pl(String locale) {
        return locale == null || locale.startsWith("pl");
    }

    public Notifier.Email verifyEmail(String to, String locale, String link) {
        boolean pl = pl(locale);
        return build(to, pl ? "Potwierdź adres e-mail" : "Confirm your e-mail address",
                pl ? "Dziękujemy za założenie konta. Potwierdź swój adres e-mail, klikając poniższy link (ważny 24 godziny):"
                        : "Thanks for creating an account. Please confirm your e-mail address with the link below (valid for 24 hours):",
                link, pl ? "Potwierdź e-mail" : "Confirm e-mail", List.of());
    }

    public Notifier.Email passwordReset(String to, String locale, String link) {
        boolean pl = pl(locale);
        return build(to, pl ? "Ustaw nowe hasło" : "Reset your password",
                pl ? "Otrzymaliśmy prośbę o zmianę hasła. Jeśli to nie Ty, zignoruj tę wiadomość. Link jest ważny 1 godzinę:"
                        : "We received a request to reset your password. If this wasn't you, ignore this e-mail. The link is valid for 1 hour:",
                link, pl ? "Ustaw nowe hasło" : "Set a new password", List.of());
    }

    public Notifier.Email orderConfirmed(String to, String locale, String number, String total, List<String> lines, String link) {
        boolean pl = pl(locale);
        return build(to, (pl ? "Potwierdzenie zamówienia " : "Order confirmation ") + number,
                pl ? "Dziękujemy! Otrzymaliśmy płatność za zamówienie " + number + " (" + total + "). Przygotujemy je do produkcji i damy znać o wysyłce."
                        : "Thank you! We received payment for order " + number + " (" + total + "). We will prepare it for production and let you know when it ships.",
                link, pl ? "Zobacz zamówienie" : "View your order", lines);
    }

    private Notifier.Email build(String to, String subject, String intro, String link, String button, List<String> lines) {
        String name = brand.name();
        StringBuilder text = new StringBuilder(intro).append("\n\n");
        lines.forEach(l -> text.append("• ").append(l).append('\n'));
        text.append('\n').append(link).append("\n\n— ").append(name).append('\n').append(brand.supportEmail());
        StringBuilder items = new StringBuilder();
        lines.forEach(l -> items.append("<li>").append(HtmlUtils.htmlEscape(l)).append("</li>"));
        String html = """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17142b">
                <p style="font-size:20px;font-weight:bold">%s</p><p>%s</p>%s
                <p><a href="%s" style="display:inline-block;background:#17142b;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">%s</a></p>
                <p style="color:#4a4560;font-size:12px">%s · %s</p></div>""".formatted(
                HtmlUtils.htmlEscape(name), HtmlUtils.htmlEscape(intro), items.isEmpty() ? "" : "<ul>" + items + "</ul>",
                HtmlUtils.htmlEscape(link), HtmlUtils.htmlEscape(button), HtmlUtils.htmlEscape(name), HtmlUtils.htmlEscape(brand.supportEmail()));
        return new Notifier.Email(to, subject + " · " + name, text.toString(), html);
    }
}
