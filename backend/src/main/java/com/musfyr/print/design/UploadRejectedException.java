package com.musfyr.print.design;

/** An upload that failed validation. {@code code} is stable so clients can show a translated message. */
public class UploadRejectedException extends RuntimeException {

    private final String code;

    public UploadRejectedException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
