/**
 * Generates placeholder cake images (SVG) into /public/cakes.
 * Run once: node scripts/gen-images.mjs
 * Replace them anytime by uploading real photos from the admin dashboard.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "cakes");
mkdirSync(OUT, { recursive: true });

const cakes = [
  { slug: "chocolate-truffle", name: "Chocolate Truffle", emoji: "🍫", colors: ["#5b2c18", "#8b4a2b", "#c98a5b"] },
  { slug: "red-velvet", name: "Red Velvet", emoji: "🌹", colors: ["#7a1024", "#b32237", "#e8748a"] },
  { slug: "black-forest", name: "Black Forest", emoji: "🍒", colors: ["#2b1216", "#54222b", "#8c4a52"] },
  { slug: "vanilla-dream", name: "Vanilla Dream", emoji: "🍦", colors: ["#8a6a2f", "#c9a44e", "#f0dcae"] },
  { slug: "oreo-crunch", name: "Oreo Crunch", emoji: "🍪", colors: ["#18181b", "#3f3f46", "#a1a1aa"] },
  { slug: "strawberry-bliss", name: "Strawberry Bliss", emoji: "🍓", colors: ["#8c1f3a", "#d84a68", "#f8a5b8"] },
  { slug: "butterscotch", name: "Butterscotch", emoji: "🍯", colors: ["#7a4a12", "#b8791f", "#eab866"] },
  { slug: "mango-delight", name: "Mango Delight", emoji: "🥭", colors: ["#8a5a08", "#e09b12", "#f9d77a"] },
  { slug: "berry-cheesecake", name: "Berry Cheesecake", emoji: "🫐", colors: ["#3d1f5e", "#6b3a92", "#b58fd6"] },
  { slug: "kids-cartoon", name: "Kids Cartoon", emoji: "🎈", colors: ["#12507a", "#1f7fb8", "#79cbe8"] },
];

const variants = [
  { suffix: "1", angle: 135, deco: 0 },
  { suffix: "2", angle: 45, deco: 1 },
  { suffix: "3", angle: 225, deco: 2 },
];

function svg(cake, v) {
  const [c1, c2, c3] = cake.colors;
  const uid = `${cake.slug}-${v.suffix}`;
  const sprinkles = Array.from({ length: 26 }, (_, i) => {
    const x = (i * 137) % 900;
    const y = ((i * 271) % 900) + 40;
    const r = 6 + ((i * 13) % 9);
    const colors = ["#ffd6e0", "#ffe9b0", "#c9f2ff", "#ffd0f0", "#d5ffd8"];
    return `<circle cx="${x}" cy="${y - 60}" r="${r}" fill="${colors[i % colors.length]}" opacity="0.55"/>`;
  }).join("");

  const rings = `
    <circle cx="${v.deco === 1 ? 760 : 140}" cy="${v.deco === 2 ? 760 : 150}" r="180" fill="#ffffff" opacity="0.10"/>
    <circle cx="${v.deco === 1 ? 760 : 140}" cy="${v.deco === 2 ? 760 : 150}" r="260" fill="#ffffff" opacity="0.06"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900" role="img" aria-label="${cake.name}">
  <defs>
    <linearGradient id="g_${uid}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${v.angle} .5 .5)">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow_${uid}" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="plate_${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.55"/>
    </linearGradient>
  </defs>

  <rect width="900" height="900" fill="url(#g_${uid})"/>
  ${rings}
  ${sprinkles}
  <rect width="900" height="900" fill="url(#glow_${uid})"/>

  <!-- plate -->
  <ellipse cx="450" cy="700" rx="300" ry="52" fill="#000000" opacity="0.18"/>
  <ellipse cx="450" cy="684" rx="300" ry="52" fill="url(#plate_${uid})"/>

  <!-- cake body -->
  <g>
    <rect x="270" y="470" width="360" height="180" rx="26" fill="#ffffff" opacity="0.95"/>
    <rect x="270" y="470" width="360" height="46" rx="23" fill="${c1}" opacity="0.85"/>
    <rect x="300" y="556" width="300" height="26" rx="13" fill="${c2}" opacity="0.5"/>
    <rect x="330" y="368" width="240" height="120" rx="24" fill="#ffffff" opacity="0.92"/>
    <rect x="330" y="368" width="240" height="38" rx="19" fill="${c1}" opacity="0.75"/>
    <rect x="372" y="292" width="156" height="88" rx="22" fill="#ffffff" opacity="0.88"/>
    <rect x="372" y="292" width="156" height="30" rx="15" fill="${c2}" opacity="0.7"/>
    <circle cx="450" cy="278" r="20" fill="#e0344f"/>
    <rect x="446" y="228" width="8" height="48" rx="4" fill="#f6d365"/>
    <ellipse cx="450" cy="226" rx="11" ry="16" fill="#ffb347"/>
  </g>

  <!-- emoji + label -->
  <text x="450" y="810" text-anchor="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif" font-size="74">${cake.emoji}</text>
  <text x="450" y="866" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff" opacity="0.96">${cake.name}</text>
</svg>`;
}

let count = 0;
for (const cake of cakes) {
  for (const v of variants) {
    writeFileSync(join(OUT, `${cake.slug}-${v.suffix}.svg`), svg(cake, v), "utf8");
    count++;
  }
}

// generic placeholder for admin uploads without a photo
writeFileSync(
  join(OUT, "custom-placeholder.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs><linearGradient id="cp" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ffd9e4"/><stop offset="100%" stop-color="#ffe9c7"/>
  </linearGradient></defs>
  <rect width="900" height="900" fill="url(#cp)"/>
  <text x="450" y="470" text-anchor="middle" font-family="Segoe UI Emoji, sans-serif" font-size="180">🍰</text>
  <text x="450" y="620" text-anchor="middle" font-family="Segoe UI, Helvetica, sans-serif" font-size="46" font-weight="700" fill="#9b4a63">Custom Cake</text>
</svg>`,
  "utf8",
);

writeFileSync(
  join(process.cwd(), "public", "logo.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ff5f7e"/><stop offset="100%" stop-color="#ffb648"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#lg)"/>
  <text x="256" y="330" text-anchor="middle" font-family="Segoe UI Emoji, sans-serif" font-size="230">🎂</text>
</svg>`,
  "utf8",
);

console.log(`✔ generated ${count} cake images + placeholder + logo`);
