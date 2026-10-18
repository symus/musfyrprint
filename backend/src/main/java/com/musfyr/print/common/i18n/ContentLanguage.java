package com.musfyr.print.common.i18n;

import java.util.List;
import java.util.Locale;

import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import com.musfyr.print.config.AppProperties;

/**
 * Resolves the content language of the current request from Accept-Language (via Spring's locale resolver).
 * Unsupported languages fall back to the base content language stored in the base columns.
 */
@Component
public class ContentLanguage {

    public static final String BASE = "en";

    private final List<String> supported;

    public ContentLanguage(AppProperties props) {
        this.supported = props.commerce().supportedLocales().stream()
                .map(tag -> Locale.forLanguageTag(tag).getLanguage())
                .distinct()
                .toList();
    }

    public String current() {
        String language = LocaleContextHolder.getLocale().getLanguage();
        return supported.contains(language) ? language : BASE;
    }

    public List<String> supported() {
        return supported;
    }

    public List<Locale> supportedLocales() {
        return supported.stream().map(Locale::forLanguageTag).toList();
    }
}
