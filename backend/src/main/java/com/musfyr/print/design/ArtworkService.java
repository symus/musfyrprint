package com.musfyr.print.design;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.musfyr.print.common.error.BusinessRuleException;
import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.common.ratelimit.RateLimiter;
import com.musfyr.print.common.web.RequestContext;

@Service
public class ArtworkService {

    public static final int MAX_BYTES = 10 * 1024 * 1024;

    private final JdbcClient jdbc;
    private final ArtworkInspector inspector;
    private final ArtworkStorage storage;
    private final UploadScanner scanner;
    private final RateLimiter rateLimiter;

    public ArtworkService(JdbcClient jdbc, ArtworkInspector inspector, ArtworkStorage storage, UploadScanner scanner,
                          RateLimiter rateLimiter) {
        this.jdbc = jdbc;
        this.inspector = inspector;
        this.storage = storage;
        this.scanner = scanner;
        this.rateLimiter = rateLimiter;
    }

    public record ArtworkView(UUID id, String url, String mimeType, Integer widthPx, Integer heightPx, int sizeBytes,
                              String scanStatus) {
    }

    public record ArtworkContent(String mimeType, byte[] bytes) {
    }

    record ArtworkMeta(UUID id, String mimeType, Integer widthPx, Integer heightPx, String status) {
    }

    @Transactional
    public ArtworkView upload(MultipartFile file, boolean rightsConfirmed) {
        if (!rightsConfirmed) {
            throw new UploadRejectedException("RIGHTS_NOT_CONFIRMED",
                    "Please confirm you own or have permission to use this artwork");
        }
        rateLimiter.check("artwork-upload", RequestContext.clientIp(), 40, Duration.ofHours(1));
        if (file == null || file.isEmpty()) {
            throw new UploadRejectedException("EMPTY_FILE", "The file is empty");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new UploadRejectedException("TOO_LARGE", "Files can be up to 10 MB");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new UploadRejectedException("UNREADABLE", "The file could not be read");
        }
        ArtworkInspector.Inspected info = inspector.inspect(bytes);
        UploadScanner.Result scan = scanner.scan(bytes);
        if (scan == UploadScanner.Result.INFECTED) {
            throw new UploadRejectedException("MALWARE_DETECTED", "The file was rejected by the security scan");
        }
        UUID id = UUID.randomUUID();
        String name = sanitizeName(file.getOriginalFilename());
        jdbc.sql("""
                INSERT INTO artworks (id, original_filename, mime_type, width_px, height_px, size_bytes, sha256,
                                      scan_status, rights_confirmed_at, uploader_ip)
                VALUES (:id, :name, :mime, :w, :h, :size, :sha, :scan, :rights, :ip)""")
                .param("id", id).param("name", name).param("mime", info.mimeType())
                .param("w", info.widthPx()).param("h", info.heightPx()).param("size", bytes.length)
                .param("sha", sha256(bytes)).param("scan", scan.name())
                .param("rights", java.sql.Timestamp.from(Instant.now())).param("ip", RequestContext.clientIp())
                .update();
        storage.put(id, bytes);
        return new ArtworkView(id, contentUrl(id), info.mimeType(), info.widthPx(), info.heightPx(), bytes.length,
                scan.name());
    }

    @Transactional(readOnly = true)
    public ArtworkContent content(UUID id) {
        ArtworkMeta meta = meta(id);
        if (!"ACTIVE".equals(meta.status())) {
            throw new NotFoundException("Artwork", id);
        }
        byte[] bytes = storage.get(id).orElseThrow(() -> new NotFoundException("Artwork", id));
        return new ArtworkContent(meta.mimeType(), bytes);
    }

    ArtworkMeta meta(UUID id) {
        return jdbc.sql("SELECT id, mime_type, width_px, height_px, status FROM artworks WHERE id = :id")
                .param("id", id)
                .query((rs, i) -> new ArtworkMeta(rs.getObject("id", UUID.class), rs.getString("mime_type"),
                        rs.getObject("width_px", Integer.class), rs.getObject("height_px", Integer.class),
                        rs.getString("status")))
                .optional().orElseThrow(() -> new NotFoundException("Artwork", id));
    }

    ArtworkMeta requireActive(UUID id) {
        ArtworkMeta meta;
        try {
            meta = meta(id);
        } catch (NotFoundException e) {
            throw new BusinessRuleException("The design references an unknown artwork");
        }
        if (!"ACTIVE".equals(meta.status())) {
            throw new BusinessRuleException("The design references artwork that is no longer available");
        }
        return meta;
    }

    public static String contentUrl(UUID id) {
        return "/api/v1/artworks/" + id + "/content";
    }

    private static String sanitizeName(String name) {
        String base = name == null ? "artwork" : name.replaceAll("[\\\\/]", "_").replaceAll("[^\\p{L}\\p{N}._ -]", "");
        base = base.isBlank() ? "artwork" : base;
        return base.length() > 200 ? base.substring(base.length() - 200) : base;
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
