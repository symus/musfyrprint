package com.musfyr.print.marketing;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsletterRepository extends JpaRepository<NewsletterSubscription, UUID> {

    boolean existsByEmailIgnoreCase(String email);
}
