package com.musfyr.print.design;

/**
 * Malware-scanning integration point (e.g. ClamAV over TCP). The default implementation reports NOT_SCANNED so
 * nobody mistakes an unscanned file for a clean one.
 */
public interface UploadScanner {

    enum Result { NOT_SCANNED, CLEAN, INFECTED }

    Result scan(byte[] content);
}
