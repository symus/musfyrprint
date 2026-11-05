// Open-licence (SIL OFL) font families available in the studio. The CSS is self-hosted via @fontsource.
import "@fontsource/pacifico";
import "@fontsource/anton";
import "@fontsource/caveat/700.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/permanent-marker";

export const FONTS = [
  { family: "Bricolage Grotesque Variable", label: "Bricolage" },
  { family: "Inter Variable", label: "Inter" },
  { family: "Pacifico", label: "Pacifico" },
  { family: "Anton", label: "Anton" },
  { family: "Caveat", label: "Caveat" },
  { family: "Playfair Display", label: "Playfair Display" },
  { family: "Permanent Marker", label: "Permanent Marker" },
] as const;

/** Template documents use plain family names; map them to the loaded faces. */
const ALIASES: Record<string, string> = { "Bricolage Grotesque": "Bricolage Grotesque Variable", Inter: "Inter Variable" };
export const resolveFont = (family: string) => ALIASES[family] ?? family;

/** Canvas text only renders correctly once the font is loaded. */
export async function ensureFont(family: string, weight: number | string = 400) {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(`${weight} 48px "${family}"`);
  } catch {
    // fall back to whatever the browser has
  }
}
