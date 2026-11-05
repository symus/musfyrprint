package com.musfyr.print.design;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.stereotype.Component;

/**
 * Identifies uploads by their content (magic bytes), never by file name or the browser's declared type, and reads
 * pixel dimensions without decoding the whole image. SVGs are checked by {@link SvgSanitizer}.
 */
@Component
public class ArtworkInspector {

    static final long MAX_PIXELS = 12_000L * 12_000L;

    private final SvgSanitizer svgSanitizer;

    public ArtworkInspector(SvgSanitizer svgSanitizer) {
        this.svgSanitizer = svgSanitizer;
    }

    public record Inspected(String mimeType, Integer widthPx, Integer heightPx) {
    }

    public Inspected inspect(byte[] bytes) {
        if (isPng(bytes)) {
            return raster(bytes, "image/png");
        }
        if (isJpeg(bytes)) {
            return raster(bytes, "image/jpeg");
        }
        if (looksLikeSvg(bytes)) {
            SvgSanitizer.Dimensions d = svgSanitizer.verify(bytes);
            return new Inspected("image/svg+xml", d.width(), d.height());
        }
        throw new UploadRejectedException("UNSUPPORTED_TYPE", "Only PNG, JPG and SVG files are supported");
    }

    private Inspected raster(byte[] bytes, String mime) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                throw new UploadRejectedException("CORRUPT_IMAGE", "The image could not be read");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                int w = reader.getWidth(0);
                int h = reader.getHeight(0);
                if (w <= 0 || h <= 0 || (long) w * h > MAX_PIXELS) {
                    throw new UploadRejectedException("DIMENSIONS_OUT_OF_RANGE", "Image dimensions are not supported");
                }
                return new Inspected(mime, w, h);
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new UploadRejectedException("CORRUPT_IMAGE", "The image could not be read");
        }
    }

    static boolean isPng(byte[] b) {
        return b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
    }

    static boolean isJpeg(byte[] b) {
        return b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
    }

    static boolean looksLikeSvg(byte[] b) {
        String head = new String(b, 0, Math.min(b.length, 1024), java.nio.charset.StandardCharsets.UTF_8).stripLeading();
        if (head.startsWith("﻿")) {
            head = head.substring(1);
        }
        return head.startsWith("<svg") || (head.startsWith("<?xml") && head.contains("<svg"));
    }
}
