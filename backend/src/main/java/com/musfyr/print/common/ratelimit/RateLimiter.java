package com.musfyr.print.common.ratelimit;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import com.musfyr.print.common.error.RateLimitExceededException;

/**
 * Fixed-window, in-memory rate limiter for abuse-sensitive endpoints (login, forms).
 * Single-instance only: for horizontally scaled deployments replace with a Redis-backed implementation
 * behind the same API (tracked in docs/ROADMAP.md).
 */
@Component
public class RateLimiter {

    private final Cache<String, AtomicInteger> windows = Caffeine.newBuilder()
            .maximumSize(100_000)
            .expireAfterWrite(1, TimeUnit.HOURS)
            .build();

    public void check(String bucket, String key, int limit, Duration window) {
        long windowIndex = System.currentTimeMillis() / window.toMillis();
        String cacheKey = bucket + ':' + key + ':' + windowIndex;
        int count = windows.get(cacheKey, k -> new AtomicInteger()).incrementAndGet();
        if (count > limit) {
            long remainingMs = window.toMillis() - (System.currentTimeMillis() % window.toMillis());
            throw new RateLimitExceededException(Duration.ofMillis(remainingMs));
        }
    }
}
