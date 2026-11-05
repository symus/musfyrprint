package com.musfyr.print.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Used when no SMTP server is configured: e-mails are written to the log, clearly marked as not sent. */
@Configuration
public class LogNotifier {

    private static final Logger log = LoggerFactory.getLogger(LogNotifier.class);

    @Bean
    @ConditionalOnMissingBean(Notifier.class)
    Notifier logOnlyNotifier() {
        return email -> {
            log.warn("E-mail NOT sent (no SMTP configured) to={} subject=\"{}\"\n{}", email.to(), email.subject(), email.text());
            return false;
        };
    }
}
