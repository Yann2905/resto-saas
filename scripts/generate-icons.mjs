import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#292524"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fafaf9"/>
      <stop offset="100%" stop-color="#e7e5e4"/>
    </linearGradient>
  </defs>

  <!-- Background rounded square -->
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>

  <!-- Subtle inner border -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#44403c" stroke-width="1" opacity="0.4"/>

  <!-- Plate -->
  <circle cx="256" cy="248" r="130" fill="url(#plate)" opacity="0.95"/>
  <circle cx="256" cy="248" r="108" fill="none" stroke="#d6d3d1" stroke-width="2"/>
  <circle cx="256" cy="248" r="90" fill="none" stroke="#e7e5e4" stroke-width="1"/>

  <!-- Fork (left) -->
  <g transform="translate(130, 140) rotate(-25, 30, 100)">
    <rect x="27" y="100" width="6" height="110" rx="3" fill="#78716c"/>
    <rect x="18" y="40" width="4" height="55" rx="2" fill="#78716c"/>
    <rect x="25" y="35" width="4" height="60" rx="2" fill="#78716c"/>
    <rect x="32" y="35" width="4" height="60" rx="2" fill="#78716c"/>
    <rect x="39" y="40" width="4" height="55" rx="2" fill="#78716c"/>
    <rect x="18" y="90" width="25" height="14" rx="4" fill="#78716c"/>
  </g>

  <!-- Knife (right) -->
  <g transform="translate(330, 140) rotate(25, 20, 100)">
    <rect x="17" y="100" width="7" height="110" rx="3" fill="#78716c"/>
    <path d="M15,40 L24,40 L24,95 Q24,100 20,100 L15,100 Z" fill="#a8a29e"/>
    <line x1="22" y1="45" x2="22" y2="90" stroke="#d6d3d1" stroke-width="1"/>
  </g>

  <!-- Amber "R" monogram -->
  <text x="256" y="275" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="120" font-weight="bold" fill="url(#accent)" letter-spacing="-4">
    R
  </text>

  <!-- Bottom text -->
  <text x="256" y="430" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif"
        font-size="36" font-weight="700" fill="#fafaf9" letter-spacing="8">
    RESTO
  </text>
  <text x="256" y="462" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif"
        font-size="20" font-weight="400" fill="#a8a29e" letter-spacing="12">
    SAAS
  </text>
</svg>
`;

const buf = Buffer.from(svg);

await Promise.all([
  sharp(buf).resize(192, 192).png().toFile(join(OUT, "icon-192.png")),
  sharp(buf).resize(512, 512).png().toFile(join(OUT, "icon-512.png")),
  sharp(buf).resize(32, 32).png().toFile(join(OUT, "favicon-32.png")),
]);

console.log("Done — icon-192.png, icon-512.png, favicon-32.png in /public");
