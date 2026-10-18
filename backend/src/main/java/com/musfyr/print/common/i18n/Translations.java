package com.musfyr.print.common.i18n;

import java.util.Map;

import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Reads values from an entity's {@code i18n} JSON document: {"pl": {"name": "..."}}. */
@Component
public class Translations {

    private static final TypeReference<Map<String, Map<String, String>>> TYPE = new TypeReference<>() {
    };

    private final JsonMapper jsonMapper;

    public Translations(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    public String text(String i18nJson, String language, String field, String fallback) {
        if (i18nJson == null || i18nJson.length() <= 2 || ContentLanguage.BASE.equals(language)) {
            return fallback;
        }
        Map<String, String> fields = jsonMapper.readValue(i18nJson, TYPE).get(language);
        String value = fields == null ? null : fields.get(field);
        return value == null || value.isBlank() ? fallback : value;
    }
}
