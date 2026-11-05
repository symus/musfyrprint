package com.musfyr.print.design;

import java.util.Optional;
import java.util.UUID;

/** Where artwork bytes live. The database implementation suits a small shop; swap for S3/R2 at scale. */
public interface ArtworkStorage {

    void put(UUID artworkId, byte[] content);

    Optional<byte[]> get(UUID artworkId);
}
