package com.musfyr.print.design;

import org.springframework.stereotype.Component;

/** Default scanner: no scanning configured. A real scanner bean annotated {@code @Primary} replaces it. */
@Component
public class NotConfiguredUploadScanner implements UploadScanner {

    @Override
    public Result scan(byte[] content) {
        return Result.NOT_SCANNED;
    }
}
