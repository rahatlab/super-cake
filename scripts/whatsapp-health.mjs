#!/usr/bin/env node
/**
 * WhatsApp Cloud API health check for Super Cake.
 *
 * Usage: npm run wa:health
 *
 * Checks:
 *  - phone number status / code verification / display name
 *  - WABA can_send_message + blocking errors
 *  - app subscription (webhook delivery)
 *  - template inventory
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const GRAPH = "https://graph.facebook.com/v26.0";

function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  const env = {};
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall through to process.env
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const token = env.WHATSAPP_TOKEN;
const phoneId = env.WHATSAPP_PHONE_ID;
const wabaId = env.WHATSAPP_WABA_ID;

if (!token || !phoneId || !wabaId) {
  console.error("Missing WHATSAPP_TOKEN, WHATSAPP_PHONE_ID or WHATSAPP_WABA_ID in .env.local");
  process.exit(1);
}

async function graph(pathname) {
  const res = await fetch(`${GRAPH}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const phone = await graph(
    `/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating,` +
      `code_verification_status,platform_type,status,health_status,name_status,new_name_status`,
  );

  if (!phone.ok) {
    console.error(`Phone lookup failed (HTTP ${phone.status}):`, JSON.stringify(phone.json, null, 2));
    process.exit(1);
  }

  const p = phone.json;
  console.log("== Phone number ==");
  console.log(`  ${p.display_phone_number} (${p.verified_name})`);
  console.log(`  status: ${p.status}`);
  console.log(`  quality: ${p.quality_rating}`);
  console.log(`  code verification: ${p.code_verification_status}`);
  console.log(`  display name: ${p.name_status ?? "?"}${p.new_name_status ? ` (new: ${p.new_name_status})` : ""}`);
  console.log(`  can send: ${p.health_status?.can_send_message ?? "UNKNOWN"}`);

  const wabaEntity = (p.health_status?.entities ?? []).find((e) => e.entity_type === "WABA");
  if (wabaEntity) {
    console.log(`\n== WABA ${wabaEntity.id} ==`);
    console.log(`  can send: ${wabaEntity.can_send_message}`);
    for (const error of wabaEntity.errors ?? []) {
      console.log(`  ✗ ${error.error_code}: ${error.error_description}`);
      if (error.possible_solution) console.log(`    fix: ${error.possible_solution}`);
    }
  }

  const subscribed = await graph(`/${wabaId}/subscribed_apps`);
  console.log("\n== Webhook subscription ==");
  if (!subscribed.ok) {
    console.log(`  ✗ lookup failed (HTTP ${subscribed.status})`);
  } else {
    const apps = subscribed.json.data ?? [];
    if (apps.length) {
      for (const app of apps) {
        const info = app.whatsapp_business_api_data ?? {};
        console.log(`  ✓ ${info.name ?? "app"} (id ${info.id ?? "?"})`);
      }
    } else {
      console.log("  ✗ no app subscribed — Meta webhook events will not arrive");
    }
  }

  const templates = await graph(
    `/${wabaId}/message_templates?fields=name,status,language&limit=100`,
  );
  console.log("\n== Templates ==");
  if (!templates.ok) {
    console.log(`  ✗ lookup failed (HTTP ${templates.status})`);
  } else {
    const rows = templates.json.data ?? [];
    if (!rows.length) console.log("  (none)");
    for (const t of rows) {
      console.log(`  ${t.status === "APPROVED" ? "✓" : "–"} ${t.name} [${t.language}] ${t.status}`);
    }
  }

  const blocked = p.health_status?.can_send_message !== "AVAILABLE" ||
    wabaEntity?.can_send_message === "BLOCKED";

  console.log("\n== Result ==");
  if (blocked) {
    console.log("✗ Business-initiated messages are BLOCKED. Fix Meta issues above before enabling templates.");
    process.exit(2);
  }
  console.log("✓ WhatsApp sending is healthy.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
