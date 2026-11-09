import path from "path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Order, Settings } from "./types";
import { ORDER_STATUS_META, PAYMENT_METHOD_LABEL } from "./constants";
import { formatBDT, formatDateTime } from "./utils";

let registered = false;
function ensureFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "public/fonts");
  Font.register({
    family: "NotoSansBengali",
    fonts: [
      { src: path.join(dir, "noto-sans-bengali-400.woff"), fontWeight: 400 },
      { src: path.join(dir, "noto-sans-bengali-700.woff"), fontWeight: 700 },
    ],
  });
  registered = true;
}

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "NotoSansBengali", fontSize: 10, color: "#1f2421" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1px solid #ddd", paddingBottom: 12 },
  store: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#777", fontSize: 8 },
  right: { textAlign: "right" },
  mono: { fontSize: 12, fontWeight: 700 },
  section: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  label: { color: "#888", fontSize: 7, textTransform: "uppercase" },
  tableHead: { flexDirection: "row", borderTop: "1px solid #ddd", borderBottom: "1px solid #ddd", paddingVertical: 5, fontWeight: 700, fontSize: 8, color: "#888" },
  row: { flexDirection: "row", paddingVertical: 5 },
  colItem: { flex: 3 }, colW: { flex: 1 }, colQ: { flex: 0.7 }, colP: { flex: 1 }, colT: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTop: "1px solid #ddd", marginTop: 8, paddingTop: 8, fontWeight: 700, fontSize: 12 },
  footer: { marginTop: 18, borderTop: "1px solid #ddd", paddingTop: 8, textAlign: "center", color: "#888", fontSize: 8 },
  design: { marginTop: 10, flexDirection: "row", gap: 10 },
  designImg: { width: 150, height: 110, objectFit: "cover" },
});

export function InvoiceDocument({ order, settings }: { order: Order; settings: Settings }) {
  ensureFonts();
  const meta = ORDER_STATUS_META[order.order_status];
  const design = order.custom_spec?.design_image_url;

  return (
    <Document title={`Invoice ${order.order_no}`} author={settings.store_name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.store}>{settings.store_name}</Text>
            <Text style={s.muted}>{settings.tagline}</Text>
            <Text style={s.muted}>{settings.address} · {settings.phone} · {settings.email}</Text>
          </View>
          <View style={s.right}>
            <Text style={s.label}>Invoice</Text>
            <Text style={s.mono}>{order.order_no}</Text>
            <Text style={s.muted}>{formatDateTime(order.created_at)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <View>
            <Text style={s.label}>কাস্টমার</Text>
            <Text>{order.customer_name}</Text>
            <Text style={s.muted}>{order.phone}</Text>
            {order.email ? <Text style={s.muted}>{order.email}</Text> : null}
          </View>
          <View>
            <Text style={s.label}>ডেলিভারি</Text>
            <Text>{order.delivery_date}{order.delivery_slot ? ` · ${order.delivery_slot}` : ""}</Text>
            <Text style={s.muted}>{order.address}</Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <View style={s.tableHead}>
            <Text style={s.colItem}>আইটেম</Text><Text style={s.colW}>ওজন</Text><Text style={s.colQ}>Qty</Text><Text style={s.colP}>একক</Text><Text style={s.colT}>মোট</Text>
          </View>
          {order.items.map((it, i) => (
            <View style={s.row} key={i}>
              <Text style={s.colItem}>{it.name}</Text>
              <Text style={s.colW}>{it.weight ? `${it.weight} lb` : "—"}</Text>
              <Text style={s.colQ}>×{it.quantity}</Text>
              <Text style={s.colP}>{formatBDT(it.unit_price)}</Text>
              <Text style={s.colT}>{formatBDT(it.unit_price * it.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 10 }}>
          <View style={s.totalRow}><Text style={s.muted}>Subtotal</Text><Text>{formatBDT(order.subtotal)}</Text></View>
          {order.discount_amount > 0 ? <View style={s.totalRow}><Text style={s.muted}>Promo {order.promo_code ?? ""}</Text><Text>− {formatBDT(order.discount_amount)}</Text></View> : null}
          {order.referral_discount > 0 ? <View style={s.totalRow}><Text style={s.muted}>Referral</Text><Text>− {formatBDT(order.referral_discount)}</Text></View> : null}
          <View style={s.totalRow}><Text style={s.muted}>ডেলিভারি চার্জ</Text><Text>{order.delivery_charge === 0 ? "ফ্রি" : formatBDT(order.delivery_charge)}</Text></View>
          <View style={s.grand}><Text>সর্বমোট</Text><Text>{formatBDT(order.total)}</Text></View>
          <View style={s.totalRow}>
            <Text style={s.muted}>পেমেন্ট: {PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method} · {order.payment_status}{order.bkash_trx_id ? ` · TrxID ${order.bkash_trx_id}` : ""}</Text>
            <Text style={s.muted}>{meta.label} · {meta.bn}</Text>
          </View>
        </View>

        {design ? (
          <View style={s.design}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Custom Design</Text>
              <Text>আকৃতি: {order.custom_spec?.cake_shape ?? "—"} · টিয়ার: {order.custom_spec?.tiers ?? "—"} · সিরাপ: {order.custom_spec?.syrup ?? "—"} · সাজসজ্জা: {order.custom_spec?.decoration ?? "—"}</Text>
              {order.custom_spec?.message_on_cake ? <Text>কেকের লেখা: {order.custom_spec.message_on_cake}</Text> : null}
              {order.custom_spec?.design_notes ? <Text>ডিজাইন: {order.custom_spec.design_notes}</Text> : null}
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
            <Image src={design} style={s.designImg} />
          </View>
        ) : null}

        <Text style={s.footer}>ধন্যবাদ! {settings.store_name} — {settings.phone}</Text>
      </Page>
    </Document>
  );
}
