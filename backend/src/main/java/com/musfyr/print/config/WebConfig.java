package com.musfyr.print.config;

import java.io.IOException;
import java.util.Locale;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import com.musfyr.print.common.i18n.ContentLanguage;

@Configuration
public class WebConfig {

    /** Accept-Language drives content language and Bean Validation message language. */
    @Bean
    LocaleResolver localeResolver(ContentLanguage contentLanguage) {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(contentLanguage.supportedLocales());
        resolver.setDefaultLocale(Locale.forLanguageTag(ContentLanguage.BASE));
        return resolver;
    }

    /** Responses differ by language, so shared HTTP caches must key on Accept-Language. */
    @Bean
    OncePerRequestFilter varyAcceptLanguageFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                            FilterChain chain) throws ServletException, IOException {
                response.addHeader(HttpHeaders.VARY, HttpHeaders.ACCEPT_LANGUAGE);
                chain.doFilter(request, response);
            }
        };
    }
}
