package com.musfyr.print.payments;

import org.springframework.boot.web.server.context.WebServerInitializedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** This API's own address as seen from inside the container (used by the in-process payment simulator). */
@Component
public class LocalServerUrl {

    private volatile String url = "http://localhost:8080";

    @EventListener
    void onStart(WebServerInitializedEvent event) {
        url = "http://localhost:" + event.getWebServer().getPort();
    }

    public String get() {
        return url;
    }
}
