package com.musfyr.print.design;

import java.io.ByteArrayInputStream;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;

/**
 * Rejects SVGs that could run code or load external resources. We reject rather than "clean" so the stored file is
 * exactly what the customer uploaded. Files are additionally served with a sandboxing Content-Security-Policy.
 */
@Component
public class SvgSanitizer {

    private static final Set<String> FORBIDDEN_ELEMENTS = Set.of("script", "foreignobject", "iframe", "embed", "object",
            "audio", "video", "animate", "set", "animatemotion", "animatetransform", "handler", "listener");
    private static final Pattern NUMBER = Pattern.compile("^\\s*([0-9]*\\.?[0-9]+)\\s*(px)?\\s*$");

    public record Dimensions(Integer width, Integer height) {
    }

    public Dimensions verify(byte[] bytes) {
        Document doc = parse(bytes);
        Element root = doc.getDocumentElement();
        if (!"svg".equalsIgnoreCase(localName(root))) {
            throw reject("Not an SVG document");
        }
        walk(root);
        return dimensions(root);
    }

    private Document parse(byte[] bytes) {
        try {
            DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
            f.setNamespaceAware(true);
            f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            f.setFeature("http://xml.org/sax/features/external-general-entities", false);
            f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            f.setXIncludeAware(false);
            f.setExpandEntityReferences(false);
            f.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            f.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            DocumentBuilder b = f.newDocumentBuilder();
            b.setErrorHandler(null);
            return b.parse(new ByteArrayInputStream(bytes));
        } catch (UploadRejectedException e) {
            throw e;
        } catch (Exception e) {
            throw reject("The SVG file could not be parsed");
        }
    }

    private void walk(Node node) {
        if (node instanceof Element el) {
            String name = localName(el).toLowerCase(Locale.ROOT);
            if (FORBIDDEN_ELEMENTS.contains(name)) {
                throw reject("SVG contains a forbidden element: " + name);
            }
            NamedNodeMap attrs = el.getAttributes();
            for (int i = 0; i < attrs.getLength(); i++) {
                Node a = attrs.item(i);
                String an = (a.getLocalName() != null ? a.getLocalName() : a.getNodeName()).toLowerCase(Locale.ROOT);
                String value = a.getNodeValue() == null ? "" : a.getNodeValue().trim().toLowerCase(Locale.ROOT);
                if (an.startsWith("on")) {
                    throw reject("SVG contains an event handler attribute");
                }
                if ((an.equals("href")) && !(value.startsWith("#") || value.startsWith("data:image/png")
                        || value.startsWith("data:image/jpeg"))) {
                    throw reject("SVG references an external resource");
                }
                if (value.contains("javascript:") || value.matches(".*url\\(\\s*['\"]?(?!#).*")) {
                    throw reject("SVG references an external resource");
                }
            }
            if ("style".equals(name) && el.getTextContent() != null) {
                String css = el.getTextContent().toLowerCase(Locale.ROOT);
                if (css.contains("@import") || css.contains("javascript:") || css.matches("(?s).*url\\(\\s*['\"]?(?!#).*")) {
                    throw reject("SVG stylesheet references an external resource");
                }
            }
        }
        for (Node c = node.getFirstChild(); c != null; c = c.getNextSibling()) {
            walk(c);
        }
    }

    private Dimensions dimensions(Element root) {
        Integer w = number(root.getAttribute("width"));
        Integer h = number(root.getAttribute("height"));
        if ((w == null || h == null) && !root.getAttribute("viewBox").isBlank()) {
            String[] vb = root.getAttribute("viewBox").trim().split("[\\s,]+");
            if (vb.length == 4) {
                try {
                    w = w == null ? (int) Math.round(Double.parseDouble(vb[2])) : w;
                    h = h == null ? (int) Math.round(Double.parseDouble(vb[3])) : h;
                } catch (NumberFormatException ignored) {
                    // keep nulls; vectors print at any size
                }
            }
        }
        return new Dimensions(w, h);
    }

    private static Integer number(String v) {
        Matcher m = NUMBER.matcher(v == null ? "" : v);
        return m.matches() ? (int) Math.round(Double.parseDouble(m.group(1))) : null;
    }

    private static String localName(Node n) {
        return n.getLocalName() != null ? n.getLocalName() : n.getNodeName();
    }

    private static UploadRejectedException reject(String message) {
        return new UploadRejectedException("UNSAFE_SVG", message);
    }
}
