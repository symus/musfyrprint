package com.musfyr.print.design;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
public class DatabaseArtworkStorage implements ArtworkStorage {

    private final JdbcClient jdbc;

    public DatabaseArtworkStorage(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void put(UUID artworkId, byte[] content) {
        jdbc.sql("INSERT INTO artwork_blobs (artwork_id, content) VALUES (:id, :content)")
                .param("id", artworkId).param("content", content).update();
    }

    @Override
    public Optional<byte[]> get(UUID artworkId) {
        return jdbc.sql("SELECT content FROM artwork_blobs WHERE artwork_id = :id")
                .param("id", artworkId).query(byte[].class).optional();
    }
}
