package com.musfyr.print.catalog.service;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;

/** Evicts every storefront catalogue cache after a back-office write. */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Caching(evict = {
        @CacheEvict(cacheNames = ProductDetailService.CACHE, allEntries = true),
        @CacheEvict(cacheNames = CatalogQueryService.CACHE_CATEGORIES, allEntries = true),
        @CacheEvict(cacheNames = CatalogQueryService.CACHE_COLLECTIONS, allEntries = true),
        @CacheEvict(cacheNames = CatalogQueryService.CACHE_FACETS, allEntries = true)})
public @interface CatalogCacheEviction {
}
