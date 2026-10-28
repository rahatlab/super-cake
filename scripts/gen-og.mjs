/**
 * Generates /public/og.png (1200x630) for social share cards.
 * Run: node scripts/gen-og.mjs
 * Uses sharp (already shipped with Next.js image optimization).
 */
import { writeFileSync, existsSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "og.png");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff5f7e"/>
      <stop offset="55%" stop-color="#ff8a5b"/>
      <stop offset="100%" stop-color="#ffb648"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="140" cy="90" r="180" fill="#ffffff" opacity="0.10"/>
  <circle cx="1060" cy="560" r="230" fill="#ffffff" opacity="0.10"/>

  ${Array.from({ length: 30 }, (_, i) => {
    const x = (i * 173) % 1200;
    const y = (i * 271) % 630;
    const colors = ["#ffffff", "#ffe9b0", "#d5ffd8", "#ffd0f0"];
    return `<circle cx="${x}" cy="${y}" r="${5 + ((i * 7) % 10)}" fill="${colors[i % colors.length]}" opacity="0.45"/>`;
  }).join("")}

  <!-- cake -->
  <g transform="translate(830 140)">
    <ellipse cx="140" cy="360" rx="150" ry="30" fill="#000000" opacity="0.18"/>
    <rect x="30" y="230" width="220" height="120" rx="20" fill="#ffffff" opacity="0.96"/>
    <rect x="30" y="230" width="220" height="34" rx="17" fill="#7a2a3a" opacity="0.9"/>
    <rect x="60" y="150" width="160" height="90" rx="18" fill="#ffffff" opacity="0.94"/>
    <rect x="60" y="150" width="160" height="28" rx="14" fill="#a5354a" opacity="0.85"/>
    <rect x="92" y="88" width="96" height="70" rx="16" fill="#ffffff" opacity="0.9"/>
    <rect x="92" y="88" width="96" height="24" rx="12" fill="#c4526a" opacity="0.8"/>
    <circle cx="140" cy="76" r="14" fill="#e0344f"/>
    <rect x="137" y="40" width="6" height="34" rx="3" fill="#f6d365"/>
    <ellipse cx="140" cy="38" rx="8" ry="12" fill="#ffb347"/>
  </g>

  <text x="90" y="250" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="86" font-weight="800" fill="#ffffff">Super Cake</text>
  <text x="90" y="330" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="40" font-weight="600" fill="#ffffff" opacity="0.95">Custom Cakes for Every Celebration</text>

  <g transform="translate(90 390)">
    <rect width="620" height="86" rx="24" fill="url(#card)"/>
    <text x="32" y="38" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff">🎂  Birthday · Anniversary · Occasion · Gift</text>
    <text x="32" y="70" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="500" fill="#ffffff" opacity="0.9">Cash on Delivery  ·  bKash  ·  Same-day delivery</text>
  </g>

  <text x="90" y="560" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff" opacity="0.95">⭐ 4.9/5  ·  5,000+ happy customers</text>
</svg>`;

async function main() {
  try {
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile(OUT);
    console.log(`✔ generated ${OUT}`);
  } catch (e) {
    if (!existsSync(OUT)) {
      console.warn(`⚠ sharp unavailable (${e.message}) — wrote SVG fallback instead`);
      writeFileSync(OUT.replace(/\.png$/, ".svg"), svg, "utf8");
    } else {
      console.warn(`⚠ skipped og image: ${e.message}`);
    }
  }
}

main();
