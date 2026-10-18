package com.musfyr.print.identity.service;

import java.util.EnumSet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.musfyr.print.config.AppProperties;
import com.musfyr.print.identity.domain.Role;
import com.musfyr.print.identity.domain.User;
import com.musfyr.print.identity.domain.UserRepository;

/**
 * Creates the first administrator from BOOTSTRAP_ADMIN_* variables when no admin exists yet.
 * Remove the variables after first start in production.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private static final int MIN_PASSWORD_LENGTH = 12;

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties.BootstrapAdmin config;

    public AdminBootstrap(UserRepository users, PasswordEncoder passwordEncoder, AppProperties props) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.config = props.bootstrapAdmin();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (config == null || !StringUtils.hasText(config.email()) || !StringUtils.hasText(config.password())) {
            return;
        }
        if (users.existsByRole(Role.ADMIN)) {
            return;
        }
        if (config.password().length() < MIN_PASSWORD_LENGTH) {
            log.warn("BOOTSTRAP_ADMIN_PASSWORD must be at least {} characters; admin not created", MIN_PASSWORD_LENGTH);
            return;
        }
        User admin = new User(config.email(), passwordEncoder.encode(config.password()),
                StringUtils.hasText(config.displayName()) ? config.displayName() : "Store Admin",
                EnumSet.of(Role.ADMIN));
        users.save(admin);
        log.info("Bootstrap administrator created for {}", admin.getEmail());
    }
}
