package com.musfyr.print.common.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class RequestContext {

    private RequestContext() {
    }

    /**
     * Client IP as seen by the servlet container. X-Forwarded-* headers are applied by Spring's
     * ForwardedHeaderFilter, so production must sit behind a proxy that overwrites those headers.
     */
    public static String clientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            return request.getRemoteAddr();
        }
        return "unknown";
    }
}
