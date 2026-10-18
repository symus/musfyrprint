package com.musfyr.print.catalog.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.musfyr.print.catalog.domain.Color;

public interface ColorRepository extends JpaRepository<Color, UUID> {

    List<Color> findByCodeIn(Collection<String> codes);

    boolean existsByCode(String code);

    List<Color> findAllByOrderBySortOrderAsc();
}
