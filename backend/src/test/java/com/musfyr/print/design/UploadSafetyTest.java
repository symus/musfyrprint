package com.musfyr.print.design;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;

class UploadSafetyTest {

    private final ArtworkInspector inspector = new ArtworkInspector(new SvgSanitizer());

    static byte[] png(int w, int h) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB), "png", out);
        return out.toByteArray();
    }

    private static byte[] svg(String body) {
        return body.getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void readsPngAndJpegDimensionsFromContent() throws Exception {
        assertThat(inspector.inspect(png(1200, 800))).isEqualTo(new ArtworkInspector.Inspected("image/png", 1200, 800));
        ByteArrayOutputStream jpg = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(300, 200, BufferedImage.TYPE_INT_RGB), "jpg", jpg);
        assertThat(inspector.inspect(jpg.toByteArray()).mimeType()).isEqualTo("image/jpeg");
    }

    @Test
    void rejectsFilesThatAreNotImagesWhateverTheirName() {
        assertThatThrownBy(() -> inspector.inspect("MZ\u0090 not an image".getBytes(StandardCharsets.ISO_8859_1)))
                .isInstanceOf(UploadRejectedException.class).extracting("code").isEqualTo("UNSUPPORTED_TYPE");
        assertThatThrownBy(() -> inspector.inspect(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0, 0, 0, 0, 0, 0}))
                .isInstanceOf(UploadRejectedException.class).extracting("code").isEqualTo("CORRUPT_IMAGE");
    }

    @Test
    void acceptsPlainSvgAndReadsItsSize() {
        var r = inspector.inspect(svg("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 400 300\"><defs><linearGradient id=\"g\"/></defs>"
                + "<rect width=\"10\" height=\"10\" fill=\"url(#g)\"/></svg>"));
        assertThat(r).isEqualTo(new ArtworkInspector.Inspected("image/svg+xml", 400, 300));
    }

    @Test
    void rejectsSvgThatCouldRunCodeOrLoadResources() {
        String[] unsafe = {
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>",
                "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"/>",
                "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><image xlink:href=\"https://evil.example/x.png\"/></svg>",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><a href=\"javascript:alert(1)\"><text>x</text></a></svg>",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><foreignObject><div xmlns=\"http://www.w3.org/1999/xhtml\">x</div></foreignObject></svg>",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><style>@import url(https://evil.example/a.css);</style></svg>",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"><rect fill=\"url(https://evil.example/p.svg#a)\"/></svg>",
                "<?xml version=\"1.0\"?><!DOCTYPE svg [<!ENTITY x SYSTEM \"file:///etc/passwd\">]><svg xmlns=\"http://www.w3.org/2000/svg\"><text>&x;</text></svg>",
        };
        for (String s : unsafe) {
            assertThatThrownBy(() -> inspector.inspect(svg(s))).as(s)
                    .isInstanceOf(UploadRejectedException.class).extracting("code").isEqualTo("UNSAFE_SVG");
        }
    }
}
