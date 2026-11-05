package com.musfyr.print.support;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Primary;

import com.musfyr.print.notify.Notifier;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@TestConfiguration(proxyBeanMethods = false)
public class TestDatabaseConfig {

    /** Captures e-mails instead of sending them, so tests can follow verification and reset links. */
    public static final List<Notifier.Email> SENT = new CopyOnWriteArrayList<>();

    @Bean
    @Primary
    Notifier capturingNotifier() {
        return email -> {
            SENT.add(email);
            return true;
        };
    }

    @Bean
    FlywayMigrationStrategy cleanMigrate() {
        return flyway -> {
            flyway.clean();
            flyway.migrate();
        };
    }
}
