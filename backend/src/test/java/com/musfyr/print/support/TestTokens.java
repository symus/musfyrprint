package com.musfyr.print.support;

import java.util.EnumSet;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.musfyr.print.identity.domain.Role;
import com.musfyr.print.identity.domain.User;
import com.musfyr.print.identity.domain.UserRepository;
import com.musfyr.print.identity.service.TokenService;

/** Creates users with given roles and returns a Bearer header value for them. */
@Component
public class TestTokens {

    private final UserRepository users;
    private final TokenService tokens;
    private final TransactionTemplate tx;

    public TestTokens(UserRepository users, TokenService tokens, TransactionTemplate tx) {
        this.users = users;
        this.tokens = tokens;
        this.tx = tx;
    }

    public String bearer(Role role, Role... more) {
        User user = tx.execute(s -> users.save(new User("user-" + UUID.randomUUID() + "@test.local", null,
                "Test " + role, EnumSet.of(role, more))));
        return "Bearer " + tokens.issueAccessToken(user).value();
    }
}
