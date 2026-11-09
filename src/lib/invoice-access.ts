import { getCurrentUser, verifyInvoiceAccessToken, verifyOrderAccessToken } from "./auth";
import { getStore } from "./store";
import { phoneDigits } from "./utils";
import type { Order } from "./types";

/**
 * Shared invoice access check (page + PDF route): signed token, matching
 * phone, session owner, or admin. Returns the order when allowed.
 */
export async function getAccessibleOrder(input: {
  orderNo: string;
  token?: string | null;
  phone?: string | null;
}): Promise<Order | null> {
  const order = await getStore().getOrderByNo(decodeURIComponent(input.orderNo));
  if (!order) return null;

  const user = await getCurrentUser();
  const ownsBySession = Boolean(user && (order.user_id === user.id || user.role === "admin"));
  const tokenOk =
    verifyInvoiceAccessToken(input.token) === order.id ||
    verifyOrderAccessToken(input.token) === order.id;
  const phoneOk = Boolean(
    input.phone &&
      phoneDigits(input.phone).length >= 10 &&
      phoneDigits(input.phone).slice(-10) === phoneDigits(order.phone).slice(-10),
  );
  return ownsBySession || tokenOk || phoneOk ? order : null;
}
