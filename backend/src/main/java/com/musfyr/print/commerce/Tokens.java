package com.musfyr.print.commerce;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Random bearer secrets (order access links, e-mail tokens). Only SHA-256 hashes are stored. */
public final class Tokens {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Tokens() {
    }

    public static String random(int bytes) {
        byte[] b = new byte[bytes];
        RANDOM.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    public static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static boolean matchesHash(String storedHash, String token) {
        return token != null && storedHash != null
                && MessageDigest.isEqual(storedHash.getBytes(StandardCharsets.US_ASCII), hash(token).getBytes(StandardCharsets.US_ASCII));
    }
}
