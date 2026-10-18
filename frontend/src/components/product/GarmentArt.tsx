import { useId } from "react";

/**
 * Lightweight vector product illustrations used until product photography / 3D renders are uploaded.
 * Colour comes from the product's real colour configuration.
 */
const SILHOUETTES: Record<string, string> = {
  TSHIRT:
    "M70 30 L95 18 Q120 34 145 18 L170 30 L205 62 L182 92 L162 80 L162 210 Q120 218 78 210 L78 80 L58 92 L35 62 Z",
  LONGSLEEVE:
    "M70 30 L95 18 Q120 34 145 18 L170 30 L196 60 L222 168 L196 176 L162 92 L162 210 Q120 218 78 210 L78 92 L44 176 L18 168 L44 60 Z",
  TANK: "M84 22 L100 22 Q120 62 140 22 L156 22 Q154 60 166 84 L166 210 Q120 218 74 210 L74 84 Q86 60 84 22 Z",
  HOODIE:
    "M86 34 Q90 6 120 6 Q150 6 154 34 L176 40 L200 62 L222 172 L196 180 L164 96 L164 212 Q120 220 76 212 L76 96 L44 180 L18 172 L40 62 L64 40 Z",
  SWEATSHIRT:
    "M72 32 L98 22 Q120 36 142 22 L168 32 L198 60 L222 172 L196 180 L164 96 L164 212 Q120 220 76 212 L76 96 L44 180 L18 172 L42 60 Z",
  BODYSUIT:
    "M82 30 L102 22 Q120 34 138 22 L158 30 L188 56 L170 80 L156 72 L156 156 Q150 188 132 206 L108 206 Q90 188 84 156 L84 72 L70 80 L52 56 Z",
  TOTE: "M60 76 L180 76 L170 214 L70 214 Z M88 76 Q88 22 120 22 Q152 22 152 76 L140 76 Q140 36 120 36 Q100 36 100 76 Z",
};

function darken(hex: string, amount = 0.18) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) * (1 - amount));
  const g = Math.max(0, ((n >> 8) & 255) * (1 - amount));
  const b = Math.max(0, (n & 255) * (1 - amount));
  return `rgb(${r | 0} ${g | 0} ${b | 0})`;
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum > 170;
}

export function GarmentArt({
  garmentType,
  colorHex = "#FFFFFF",
  className,
  title,
  showPrint = true,
  printText = "your idea",
}: {
  garmentType: string;
  colorHex?: string;
  className?: string;
  title?: string;
  showPrint?: boolean;
  /** Placeholder text drawn on the chest print (localised by the caller). */
  printText?: string;
}) {
  const id = useId().replace(/:/g, "");
  const light = isLight(colorHex);
  const ink = light ? "#17142B" : "#FFFBF4";

  if (garmentType.startsWith("STICKER")) {
    return <StickerArt type={garmentType} className={className} title={title} />;
  }

  const path = SILHOUETTES[garmentType] ?? SILHOUETTES.TSHIRT;
  const chestY = garmentType === "BODYSUIT" ? 104 : garmentType === "TOTE" ? 140 : 118;

  return (
    <svg viewBox="0 0 240 230" className={className} role="img" aria-label={title ?? "Product illustration"}>
      <defs>
        <linearGradient id={`shade-${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <path d={path} fill={colorHex} stroke={darken(colorHex, light ? 0.22 : 0.35)} strokeWidth="2.5" strokeLinejoin="round" fillRule="evenodd" />
      <path d={path} fill={`url(#shade-${id})`} fillRule="evenodd" />
      {showPrint && (
        <g transform={`translate(120 ${chestY})`} aria-hidden="true">
          <circle r="22" fill="var(--color-sun)" />
          <path d="M-9 -3 a3 3 0 1 0 0.1 0 M9 -3 a3 3 0 1 0 0.1 0" fill={"#17142B"} />
          <path d="M-10 6 Q0 16 10 6" stroke="#17142B" strokeWidth="3" fill="none" strokeLinecap="round" />
          <text y="44" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="14" fill={ink}>
            {printText}
          </text>
        </g>
      )}
    </svg>
  );
}

function StickerArt({ type, className, title }: { type: string; className?: string; title?: string }) {
  const label = title ?? "Sticker illustration";
  if (type === "STICKER_SHEET") {
    return (
      <svg viewBox="0 0 240 230" className={className} role="img" aria-label={label}>
        <rect x="52" y="14" width="136" height="200" rx="10" fill="#fff" stroke="#E6DED1" strokeWidth="2" />
        <circle cx="92" cy="58" r="24" fill="var(--color-coral)" stroke="#fff" strokeWidth="5" />
        <rect x="124" y="36" width="44" height="44" rx="12" fill="var(--color-mint)" stroke="#fff" strokeWidth="5" />
        <path d="M78 108 l14 -24 l14 24 z" fill="var(--color-violet)" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="146" cy="110" r="20" fill="var(--color-sun)" stroke="#fff" strokeWidth="5" />
        <rect x="72" y="140" width="96" height="30" rx="15" fill="var(--color-sky)" stroke="#fff" strokeWidth="5" />
        <text x="120" y="160" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13" fill="#17142B">NAME</text>
        <path d="M92 186 l6 12 l13 2 l-10 9 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -9 l13 -2 z" fill="var(--color-coral)" transform="translate(28 -12) scale(0.8)" />
      </svg>
    );
  }
  if (type === "STICKER_LABEL") {
    return (
      <svg viewBox="0 0 240 230" className={className} role="img" aria-label={label}>
        <circle cx="120" cy="115" r="78" fill="#fff" stroke="#E6DED1" strokeWidth="2" />
        <circle cx="120" cy="115" r="30" fill="var(--color-cloud)" stroke="#E6DED1" strokeWidth="2" />
        {[0, 72, 144, 216, 288].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 120 115) translate(120 52)`}>
            <circle r="16" fill="var(--color-violet)" />
            <text y="4" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="var(--font-display)">LOGO</text>
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 230" className={className} role="img" aria-label={label}>
      <path
        d="M120 20 C170 20 214 52 210 104 C206 156 172 206 118 208 C64 210 26 170 28 116 C30 64 70 20 120 20 Z"
        fill="#fff"
        stroke="#E6DED1"
        strokeWidth="2"
      />
      <path
        d="M120 36 C160 36 194 62 192 104 C190 146 162 190 118 192 C74 194 44 162 46 118 C48 76 80 36 120 36 Z"
        fill="var(--color-coral)"
      />
      <circle cx="98" cy="102" r="7" fill="#17142B" />
      <circle cx="142" cy="102" r="7" fill="#17142B" />
      <path d="M94 132 Q120 156 146 132" stroke="#17142B" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M176 176 Q196 168 204 148 L210 182 Z" fill="var(--color-sun)" />
    </svg>
  );
}
