package com.musfyr.print.notify;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import com.musfyr.print.commerce.ShopProperties;

/** SMTP delivery, active when spring.mail.host is set (MAIL_HOST). */
@Component
@ConditionalOnProperty(prefix = "spring.mail", name = "host")
public class MailNotifier implements Notifier {

    private static final Logger log = LoggerFactory.getLogger(MailNotifier.class);

    private final JavaMailSender sender;
    private final ShopProperties shop;

    public MailNotifier(JavaMailSender sender, ShopProperties shop) {
        this.sender = sender;
        this.shop = shop;
    }

    @Override
    public boolean send(Email email) {
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(shop.mail().from());
            helper.setTo(email.to());
            helper.setSubject(email.subject());
            helper.setText(email.text(), email.html());
            sender.send(message);
            return true;
        } catch (Exception e) {
            log.error("E-mail delivery failed to {}: {}", email.to(), e.getMessage());
            return false;
        }
    }
}
