package com.musfyr.print.sizing;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import com.musfyr.print.common.error.NotFoundException;
import com.musfyr.print.sizing.SizingDtos.Range;
import com.musfyr.print.sizing.SizingDtos.SizeChart;
import com.musfyr.print.sizing.SizingDtos.SizeRow;

@Service
public class SizeChartService {

    public static final String CACHE = "size-charts";
    private static final TypeReference<Map<String, String>> LABELS = new TypeReference<>() {
    };

    private final JdbcClient jdbc;
    private final JsonMapper jsonMapper;

    public SizeChartService(JdbcClient jdbc, JsonMapper jsonMapper) {
        this.jdbc = jdbc;
        this.jsonMapper = jsonMapper;
    }

    @Cacheable(cacheNames = CACHE, key = "#productSlug + ':' + #lang")
    public SizeChart forProduct(String productSlug, String lang) {
        record Head(java.util.UUID id, String source, String supplier, String note) {
        }
        Head head = jdbc.sql("""
                SELECT sc.id, sc.source, sc.supplier_name, COALESCE(sc.i18n -> :lang ->> 'fit_note', sc.fit_note) AS fit_note
                FROM size_charts sc JOIN products p ON p.id = sc.product_id
                WHERE p.slug = :slug AND p.status = 'ACTIVE'""")
                .param("slug", productSlug).param("lang", lang)
                .query((rs, i) -> new Head(rs.getObject("id", java.util.UUID.class), rs.getString("source"),
                        rs.getString("supplier_name"), rs.getString("fit_note")))
                .optional()
                .orElseThrow(() -> new NotFoundException("Size chart for product", productSlug));
        List<SizeRow> rows = jdbc.sql("""
                SELECT size_code, age_min_months, age_max_months, height_min, height_max, chest_min, chest_max,
                       waist_min, waist_max, garment_width, garment_length, labels::text AS labels
                FROM size_chart_rows WHERE chart_id = :id ORDER BY sort_order""")
                .param("id", head.id()).query(this::row).list();
        return new SizeChart(head.source(), head.supplier(), head.note(), SizingDtos.SYSTEMS, rows);
    }

    private SizeRow row(ResultSet rs, int i) throws SQLException {
        return new SizeRow(rs.getString("size_code"), rs.getObject("age_min_months", Integer.class),
                rs.getObject("age_max_months", Integer.class),
                Range.of(rs.getBigDecimal("height_min"), rs.getBigDecimal("height_max")),
                Range.of(rs.getBigDecimal("chest_min"), rs.getBigDecimal("chest_max")),
                Range.of(rs.getBigDecimal("waist_min"), rs.getBigDecimal("waist_max")),
                rs.getBigDecimal("garment_width"), rs.getBigDecimal("garment_length"),
                jsonMapper.readValue(rs.getString("labels"), LABELS));
    }
}
