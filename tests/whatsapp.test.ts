import test from "node:test";
import assert from "node:assert/strict";
import {
  BUTTON_COMMANDS,
  MAX_BUTTON_TITLE,
  MAX_REPLY_BUTTONS,
  MENU_BUTTONS,
  clampReplyButtons,
  validateButtons,
} from "../src/lib/whatsapp-menu.ts";

test("the greeting menu fits Meta's interactive-button limits", () => {
  assert.ok(MENU_BUTTONS.length > 0, "the menu must offer at least one button");
  assert.ok(
    MENU_BUTTONS.length <= MAX_REPLY_BUTTONS,
    `Meta allows at most ${MAX_REPLY_BUTTONS} reply buttons`,
  );

  const ids = new Set<string>();
  for (const button of MENU_BUTTONS) {
    assert.ok(button.id, "every button needs an id");
    assert.ok(button.title, `button "${button.id}" needs a title`);
    assert.ok(
      [...button.title].length <= MAX_BUTTON_TITLE,
      `"${button.title}" exceeds Meta's ${MAX_BUTTON_TITLE}-character title limit`,
    );
    assert.ok(!ids.has(button.id), `duplicate button id "${button.id}"`);
    ids.add(button.id);
  }
});

test("every menu button maps back to a command the auto-reply already handles", () => {
  // The webhook translates a tapped button id into a command word, so an id
  // without a mapping would silently fall through to the fallback menu.
  for (const button of MENU_BUTTONS) {
    const command = BUTTON_COMMANDS[button.id];
    assert.ok(command, `no command mapped for "${button.id}"`);
    assert.ok(["1", "2", "3", "4"].includes(command), `"${button.id}" -> unexpected "${command}"`);
  }
  // And no stale mapping points at a button we removed.
  for (const id of Object.keys(BUTTON_COMMANDS)) {
    assert.ok(
      MENU_BUTTONS.some((b) => b.id === id),
      `"${id}" is mapped but not offered in the menu`,
    );
  }
});

test("clampReplyButtons truncates instead of letting the API reject the send", () => {
  const clamped = clampReplyButtons([
    { id: "a".repeat(300), title: "short" },
    { id: "b", title: "x".repeat(40) },
    { id: "c", title: "three" },
    { id: "d", title: "fourth" },
  ]);

  assert.equal(clamped.length, MAX_REPLY_BUTTONS, "extra buttons are dropped");
  assert.ok(clamped[0].id.length <= 256, "ids are capped at 256 characters");
  assert.equal([...clamped[1].title].length, MAX_BUTTON_TITLE, "titles are cut at 20 characters");
});

test("validateButtons reports every problem in one pass", () => {
  assert.deepEqual(validateButtons(MENU_BUTTONS), [], "the shipped menu must be valid");

  assert.equal(
    validateButtons([
      { id: "ok", title: "fine" },
      { id: "ok", title: "dup" },
      { id: "", title: "no id" },
      { id: "long", title: "y".repeat(21) },
      { id: "x", title: "1" },
      { id: "y", title: "2" },
    ]).length > 0,
    true,
  );

  const problems = validateButtons([
    { id: "dup", title: "one" },
    { id: "dup", title: "two" },
    { id: "wide", title: "z".repeat(21) },
  ]);
  assert.ok(problems.some((p) => p.includes("duplicate")), "duplicate ids are reported");
  assert.ok(problems.some((p) => p.includes("exceeds")), "oversized titles are reported");
});
