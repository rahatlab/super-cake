/**
 * The WhatsApp quick-reply menu contract.
 *
 * Deliberately dependency-free (no `@/` aliases, no env, no store) so it can
 * be unit-tested by `node --test` and imported from both the server action
 * layer and the webhook without dragging in the rest of the app.
 */

/** A quick-reply button on an interactive message. */
export interface WsButton {
  /** Stable id echoed back by Meta when the customer taps the button. */
  id: string;
  title: string;
}

/** Meta rejects an interactive message with more than three buttons. */
export const MAX_REPLY_BUTTONS = 3;

/** Meta truncates/rejects reply-button titles longer than 20 characters. */
export const MAX_BUTTON_TITLE = 20;

/**
 * Quick-reply buttons offered on the greeting. The ids map to the existing
 * `1` / `2` / `4` menu commands, so the handler logic is identical whether
 * the customer taps a button or types the number. (Contact stays available
 * by typing `3` — Meta only allows three buttons.)
 */
export const MENU_BUTTONS: WsButton[] = [
  { id: "menu_status", title: "অর্ডার স্ট্যাটাস" },
  { id: "menu_cakes", title: "কেক মেনু" },
  { id: "menu_order", title: "অর্ডার করুন" },
];

/** Button id → the canonical command word handled by the auto-reply. */
export const BUTTON_COMMANDS: Record<string, string> = {
  menu_status: "1",
  menu_cakes: "2",
  menu_order: "4",
};

/** Truncate to Meta's limits instead of letting the API reject the send. */
export function clampReplyButtons(buttons: WsButton[]): WsButton[] {
  return buttons.slice(0, MAX_REPLY_BUTTONS).map((b) => ({
    id: b.id.slice(0, 256),
    title: [...b.title].slice(0, MAX_BUTTON_TITLE).join(""),
  }));
}

/** Human-readable problems with a button set — empty means valid. */
export function validateButtons(buttons: WsButton[]): string[] {
  const problems: string[] = [];
  if (buttons.length > MAX_REPLY_BUTTONS) {
    problems.push(`at most ${MAX_REPLY_BUTTONS} buttons are allowed`);
  }
  const seen = new Set<string>();
  for (const b of buttons) {
    if (!b.id) problems.push("every button needs an id");
    if (!b.title) problems.push(`button "${b.id}" needs a title`);
    if ([...b.title].length > MAX_BUTTON_TITLE) {
      problems.push(`button "${b.id}" title exceeds ${MAX_BUTTON_TITLE} characters`);
    }
    if (seen.has(b.id)) problems.push(`duplicate button id "${b.id}"`);
    seen.add(b.id);
  }
  return problems;
}
