#!/usr/bin/env node
/**
 * Create / inspect Super Cake WhatsApp message templates.
 *
 * Usage:
 *   node scripts/whatsapp-templates.mjs           # check status only
 *   node scripts/whatsapp-templates.mjs --create  # create missing templates
 *
 * Requires WHATSAPP_TOKEN and WHATSAPP_WABA_ID in .env.local.
 * Templates use language "bn" (Bengali). Set WHATSAPP_TEMPLATE_LANG to change.
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
const wabaId = env.WHATSAPP_WABA_ID;
const lang = env.WHATSAPP_TEMPLATE_LANG || "bn";

if (!token || !wabaId) {
  console.error("Missing WHATSAPP_TOKEN or WHATSAPP_WABA_ID in .env.local");
  process.exit(1);
}

/** Bodies must match the parameter order used in src/lib/whatsapp.ts. */
const TEMPLATES = [
  {
    name: "order_confirmation",
    category: "UTILITY",
    body: "Super Cake: ধন্যবাদ {{1}}! আপনার অর্ডার {{2}} গ্রহণ করা হয়েছে। মোট {{3}}।",
    example: ["Rafiq Hasan", "SC-261026-7158", "৳1,600"],
    footer: "Super Cake",
  },
  {
    name: "order_status_update",
    category: "UTILITY",
    body: "Super Cake: আপনার অর্ডার {{1}} এর বর্তমান অবস্থা — {{2}}।\n\nট্র্যাক করুন: {{3}}\n\nধন্যবাদ।",
    example: ["SC-261026-7158", "নিশ্চিত হয়েছে", "http://localhost:3000/track"],
    footer: "Super Cake",
  },
  {
    name: "new_order_admin",
    category: "UTILITY",
    body: "Super Cake: নতুন অর্ডার {{1}} — মোট {{2}}।\n\nড্যাশবোর্ড: {{3}}\n\nএখনই দেখুন।",
    example: ["SC-261026-7158", "৳1,600", "http://localhost:3000/admin/orders"],
    footer: "Super Cake",
  },
  {
    name: "order_review_request",
    category: "UTILITY",
    body: "Super Cake: ধন্যবাদ {{1}}! আপনার অর্ডার {{2}} সম্পন্ন হয়েছে। আপনার অভিজ্ঞতা জানান — রিভিউ দিন: {{3}}\n\nআপনার মতামত আমাদের জন্য গুরুত্বপূর্ণ।",
    example: ["Rafiq Hasan", "SC-261026-7158", "http://localhost:3000/review/ord_example"],
    footer: "Super Cake",
  },
  {
    name: "abandoned_cart",
    category: "MARKETING",
    body: "Super Cake: আপনার কার্টে {{1}} অপেক্ষা করছে। অর্ডার সম্পন্ন করুন: {{2}}\n\nধন্যবাদ।",
    example: ["Chocolate Truffle Cake — 1 lb", "http://localhost:3000/order"],
    footer: "Super Cake",
  },
];

async function graph(pathname, init = {}) {
  const res = await fetch(`${GRAPH}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
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

function payload(template) {
  return {
    name: template.name,
    language: lang,
    category: template.category,
    components: [
      {
        type: "BODY",
        text: template.body,
        example: { body_text: [template.example] },
      },
      { type: "FOOTER", text: template.footer },
    ],
  };
}

async function listTemplates() {
  const { ok, status, json } = await graph(
    `/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`,
  );
  if (!ok) {
    console.error(`Template list failed (HTTP ${status}):`, JSON.stringify(json, null, 2));
    return null;
  }
  return json.data ?? [];
}

function statusOf(existing, template) {
  return existing.find((t) => t.name === template.name && t.language === lang);
}

async function main() {
  const create = process.argv.includes("--create");
  const existing = await listTemplates();
  if (!existing) process.exit(1);

  console.log(`WABA ${wabaId} — language ${lang}\n`);
  let missing = 0;

  for (const template of TEMPLATES) {
    const found = statusOf(existing, template);
    if (found) {
      console.log(`✓ ${template.name.padEnd(24)} ${found.status}`);
    } else {
      missing += 1;
      console.log(`– ${template.name.padEnd(24)} NOT CREATED`);
    }
  }

  if (!create) {
    if (missing) {
      console.log(`\n${missing} template(s) missing. Run with --create after the WABA is healthy.`);
    }
    return;
  }

  if (!missing) {
    console.log("\nAll templates already exist.");
    return;
  }

  console.log("\nCreating missing templates…\n");
  let failed = 0;

  for (const template of TEMPLATES) {
    if (statusOf(existing, template)) continue;

    const { ok, status, json } = await graph(`/${wabaId}/message_templates`, {
      method: "POST",
      body: JSON.stringify(payload(template)),
    });

    if (ok) {
      console.log(`✓ created ${template.name} (id ${json.id ?? "?"})`);
    } else {
      failed += 1;
      const err = json.error ?? {};
      console.log(
        `✗ ${template.name} — HTTP ${status} code ${err.code ?? "?"}` +
          (err.error_subcode ? ` subcode ${err.error_subcode}` : ""),
      );
      if (err.error_user_title) console.log(`  ${err.error_user_title}`);
      if (err.error_user_msg) console.log(`  ${err.error_user_msg}`);
      if (!err.error_user_msg) console.log(`  ${JSON.stringify(json).slice(0, 500)}`);
    }
  }

  if (failed) {
    console.log(
      "\nSome templates failed. Common causes: WABA banned, payment method error," +
        " business verification incomplete, or display name declined.",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
