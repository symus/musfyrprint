package com.musfyr.print.quotes;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRequestRepository extends JpaRepository<QuoteRequest, UUID> {

    Page<QuoteRequest> findByStatusOrderByCreatedAtDesc(QuoteRequest.Status status, Pageable pageable);

    Page<QuoteRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
