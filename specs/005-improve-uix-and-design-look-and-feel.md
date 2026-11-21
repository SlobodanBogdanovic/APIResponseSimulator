# 005 — Improve the popup and options look and feel

GitHub issue: [Improve UIX and design look and feel](https://github.com/SlobodanBogdanovic/APIResponseSimulator/issues/7)

## Who is the user and what problem do they have

The user is a developer or QA person using **API Response Simulator** while an app calls an API. They open the popup to see whether interception is on and which rules are live, and they open the options page to add, edit, import, export, or delete rules.

Both surfaces work. Neither looks like the same product. The popup is an indigo bar, a small gray count, text for “Open settings,” and switches whose focus ring is removed. The options page is a gray canvas, indigo “Add rule,” and text links for Edit and Delete. Empty states are one quiet line. The toolbar icon is a solid indigo square at 16, 48, and 128 pixels. The user cannot see, at a glance, whether the extension is intercepting, which rules are live, or what to do next.

## Problem

The popup and the options page have no shared type scale, color set, or spacing rhythm. On and off are easy to miss: the popup header switch sits on indigo, its focus outline is removed, and the off state is a small amber aside. A disabled rule is only a faded card. Primary actions are styled as links. Placeholder toolbar icons do not match either page.

Request matching, storage, and import/export already work. This change does not alter those behaviors.

## Expected user outcome

The user opens the popup and sees the product name **API Response Simulator**, a visible **On** or **Off** beside the switch, and the count of active rules. **On** is a deep teal switch with the thumb on the right. **Off** is a gray switch with the thumb on the left, the sentence `(extension disabled)` still present, and rule rows drawn as inactive. With no rules, the popup says what is missing and offers **Open settings** as a button. With rules, each row shows the name, the URL pattern, and that rule’s own **On** or **Off**.

The user opens the options page and sees the same product name, the same colors, and the same button shapes in one reading column. **Add rule** is the primary button. Import and export are secondary buttons. A rule card shows the method, the status code, the name, the pattern, and whether that rule is on. **Edit** is a button. **Delete** is visibly destructive and still asks inline before it removes the rule. The form uses the same fields as today.

Keyboard focus is visible on switches, inputs, and buttons. The toolbar icon is a teal field with a white mark, the same image for ON and OFF. The toolbar badge and tooltip are unchanged.

## User story

As a developer or QA person using API Response Simulator, I want the popup and the options page to share one look, so I can see whether interception is on, which rules are live, and what to do next.

## Assumptions

- No npm dependency is added. `jimp` stays at 0.22. No webfont file is added. Type uses the system UI stack already available to Tailwind, so the extension renders with no font request.
- Existing visible strings stay, including `(extension disabled)`, `No rules yet. Add your first rule.`, `+ Add header`, the active-count sentence, import and export messages, and the button labels listed under Behavior that stays. New words are the visible `On` and `Off` state labels. Spec 002’s toolbar badge and tooltip stay as implemented. This spec does not edit the service worker.
- The options page does not gain a global on/off control. Extension on/off is shown on the popup (and by the existing toolbar badge). An options card looks inactive only when that rule’s `enabled` is false. A rule that is enabled still looks enabled on the options page while the extension is off. The popup is where that extension-off state is shown, including muted rule rows.
- The options rule list becomes one column inside a 36rem measure. Method and status code may stay on one form row. The popup body stays 280–320px wide.
- `window.confirm()` stays forbidden. Delete keeps the inline confirm controls.
- Hover colors are specified so primary buttons do not fall back to indigo. They are part of the visual system below.
- Thumb side and the word On or Off follow only that rule’s `enabled` flag, including while the extension is off, so a saved-on rule still reads On with the thumb to the right of the track center. Signal green means intercepting now. On the popup, the word On, the switch track, and the 3px bar are signal only when the extension is on and that rule is enabled. When the extension is off, that row uses no signal: the word is secondary `#3E4C5A`, the track is idle `#6E7C8A`, the bar is line `#6B7C8C`, and the name is secondary. An options card does not show the global off state. Its word, track, and bar follow only that rule’s `enabled` flag.

## Scope

One PR. Restyle the popup and the options page with the visual system in this spec, and replace the placeholder toolbar icons. Behavior, copy, and `data-testid` values that the current suite relies on stay.

### Visual system

Signal green is used on a row only when that rule is intercepting right now: the word On, the on track, and the 3px bar together. Primary buttons use the same green for the main action. A saved-on rule while the extension is off does not use signal green. That limit is the popup row. An enabled options card still uses signal green for its On word, track, and bar while the extension is off. Everything else is paper, ink, and a line. Rejected for this product: an indigo marketing header, a warm cream page with a clay accent, a near-black page with an acid-green accent, and a grid of shadowed rounded cards.

Signal `#0B5F4E` is used only where the assumption above allows it: a popup rule’s **On** word, switch track, and live bar when the extension is on and that rule is enabled; an options card’s **On** word, switch track, and bar when that rule is enabled; the global switch track when the extension is on; primary button fills; successful import/export text; and the toolbar icon field. Idle `#6E7C8A` is the switch track in every other case, including a saved-on popup rule while the extension is off, and is never used as text (white on it is 4.27:1, which passes for the non-text track and fails for 12px text).

| Token | Hex | Use |
|---|---|---|
| paper | `#F4F7F8` | Options page background |
| panel | `#FFFFFF` | Popup surface, cards, form, inputs, secondary buttons |
| ink | `#14202E` | Primary text, focus outline, the extension **Off** word, an options-card **Off** word, status code |
| secondary | `#3E4C5A` | Meta text, URL patterns, inactive rule names, a popup rule’s On or Off word while the extension is off, disabled Export label |
| line | `#6B7C8C` | Borders, inactive 3px bar |
| signal | `#0B5F4E` | On word and switch only in the cases in Assumptions, live bar, primary fill, success text, icon field |
| signal-press | `#084A3D` | Primary button hover |
| idle | `#6E7C8A` | Switch track in every case that is not signal |
| danger | `#9B2330` | Delete label and border, Confirm fill, error text, DELETE method |
| danger-press | `#7A1B26` | Confirm hover |
| hover-panel | `#E6EEEB` | Secondary button hover |
| method-get | `#146C43` | GET word |
| method-post | `#1D4E89` | POST word |
| method-put | `#8A5A00` | PUT word |
| method-delete | `#9B2330` | DELETE word |
| method-patch | `#5B3A8C` | PATCH word |
| method-any | `#3E4C5A` | ANY word |

Ink on paper is 15.29:1. Secondary on white is 8.80:1. White on signal is 7.61:1. White on danger is 7.85:1. Each method hex on white is at least 5.93:1. Idle track on white is 4.27:1.

Type scale, at a 16px root, one family for UI and one monospace stack only for URL pattern, response body, and header name/value:

| Step | Size | Weight | Where |
|---|---|---|---|
| title | 20px | 600 | Options page heading only |
| ui | 14px | 600 for the popup product name and the On/Off words; 500 for buttons, inputs, and rule names | Popup title, controls, form labels, field values |
| meta | 12px | 400, except the active-count line and `(extension disabled)` at 600 | Count, patterns, subtitle, hints, import/export status, delay note |

UI stack: `ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Monospace stack: Tailwind `font-mono` (`ui-monospace` through `monospace`). No other text uses monospace.

Spacing uses only 4, 8, 12, 16, 24, and 32 pixels. Popup padding is 12. The options column padding is 24 on the sides and 32 on top. Cards and the form use 16 inside. Stacked rule cards and popup rows gap by 12. Form fields gap by 16.

Surfaces (popup shell, options column, cards, form) use radius 0, a 1px line border, and no shadow. Buttons and text inputs use radius 2px. The switch track is a pill. The thumb is a 16px white circle.

Primary button: panel text white on signal, hover signal-press. Secondary button: ink on panel, 1px line border, hover hover-panel. Danger button at rest (Delete): danger text, 1px danger border, panel fill. Confirm: white text on danger, hover danger-press. Disabled Export: secondary text, line border, opacity 1, still `disabled`.

Focus, for every switch, input, select, textarea, and button: on `:focus-visible`, a 2px solid ink outline with a 2px offset. Do not remove the outline without that replacement. The thumb is the only motion, at most 150ms. Under `prefers-reduced-motion: reduce`, that duration is 0s. No entrance animation.

Switch, both surfaces, same geometry: the button is 44 by 24 pixels; the thumb is 16 by 16, white, inside the button. The thumb’s horizontal center is to the right of the track’s center when that control’s own flag is on, and to the left when it is off. Track fill is signal or idle only in the cases in Assumptions and in the signal sentence above. A popup rule that stays enabled while the extension is off keeps the thumb to the right and uses an idle track.

### Popup

Width stays the current body rule: `min-width: 280px; max-width: 320px`. The rule list region keeps a max height of 256px and scrolls. Header background is panel, not a full-bleed color bar. Left to right: product name, then `On` or `Off` (`data-testid="extension-state"`), then the existing global switch. The product name is ink `#14202E`, 14px, weight 600. `(extension disabled)` is ink `#14202E`, 12px, weight 600, not amber. The header is one row and does not wrap. The product name truncates with an ellipsis. `extension-state` and the global switch stay fully visible. The header and the footer sit outside `popup-rule-list`. **Open settings** is a primary button, full width of the footer, when the list is empty and when it has rules, including when the extension is off.

The count sits under the header in its own element. The count is how many rules have `enabled` true, over how many rules exist. Turning the extension off does not change the numbers. `1 of 1 rule active` beside header Off means one rule is saved on and none are intercepting. The count text stays exactly as in the behavior table. `(extension disabled)` stays a separate element with `data-testid="extension-disabled"` and is rendered only when the extension is off.

Each rule row keeps `data-testid="popup-rule"` and `data-rule-name`. It shows the name, the URL pattern, `On` or `Off` (`data-testid="rule-power"`), and the switch (`data-testid="popup-rule-toggle"`). The switch’s accessible name is `Disable ${name}` when the rule is on and `Enable ${name}` when it is off. The global switch keeps `title` `Disable extension` when on and `Enable extension` when off.

Live bar on a popup row: 3px signal when the extension is on and the rule is enabled; 3px line otherwise. Name color is ink when the extension is on and the rule is enabled; secondary when the rule is off or the extension is off. Given the extension is off and the rule is still enabled, when the popup is shown, then the name is secondary `rgb(62, 76, 90)`, the left border is 3px solid `rgb(107, 124, 140)`, `rule-power` is still exactly `On` in `rgb(62, 76, 90)`, the track is `rgb(110, 124, 138)`, the thumb’s center is still to the right of the track’s center, and the switch’s accessible name is still `Disable ${name}`.

Empty popup copy stays `No rules yet.` and `Open settings to add one.` **Open settings** stays `data-testid="open-settings"` and still sends `{ type: 'OPEN_OPTIONS' }`. It is a primary button even when the extension is off. Loading copy stays `Loading…`.

### Options page

One column, `data-testid="options-column"`, `max-width: 36rem` (576px), centered in the viewport. Text inside is left aligned. The `h1` remains **API Response Simulator**. The subtitle stays `Manage your HTTP mock rules`. While the form is closed, **Add rule** (`data-testid="add-rule"`) is the primary button, and Import and Export stay secondary. While the form is open, those three controls are hidden, as today.

The rule list is one column. A card keeps `data-testid="rule-card"` and `data-rule-name`. It shows the method word in that method’s token color, the status code in ink, the name, the URL pattern, `rule-power` as `On` or `Off`, the switch (`data-testid="rule-enabled-toggle"`), **Edit** (`data-testid="rule-edit"`) as a secondary button, and **Delete** (`data-testid="rule-delete"`) as a danger button. The switch’s accessible name is `Disable ${name}` or `Enable ${name}` as on the popup. Delay text stays `${delayMs}ms delay` when `delayMs > 0`, and is absent at 0.

The method and the status code are plain words, with no fill and no radius. Enabled card: method in its token color, status code in ink, name in ink, `rule-power` exactly `On` in signal, track signal, thumb center to the right, accessible name `Disable ${name}`, 3px signal left border, opacity 1. Disabled card: method and status code keep those colors, name secondary, `rule-power` exactly `Off` in ink, track idle, thumb center to the left, accessible name `Enable ${name}`, 3px line left border, opacity 1.

Inline delete stays in the card: `Are you sure?`, **Confirm** (`data-testid="rule-delete-confirm"`, danger fill), **Cancel** (`data-testid="rule-delete-cancel"`, secondary). No browser confirm dialog.

The form keeps the headings `New rule` and `Edit rule` and the fields Name, URL pattern, Method, Status code, Response body, Response headers, and Delay (ms), with the current placeholders, `required` on name and URL pattern, status bounds 100–599, and delay minimum 0. Each field’s accessible name is its visible label (`Name`, `URL pattern`, `Method`, `Status code`, `Response body`, `Delay (ms)`). Header key and value accessible names stay `Header name` and `Value`. **+ Add header** stays that label (`data-testid="add-header"`). The empty-headers sentence stays `No custom headers. Content-Type: application/json is always added.` The remove control keeps `data-testid="remove-header"` and the accessible name `Remove header`. **Save rule** is primary. **Cancel** is secondary.

The empty state has no emoji. Both sentences are left aligned. The first is ink at 14px. The second is secondary at 12px. `+ Add header` is a secondary button. The remove control’s glyph stays `✕`, its accessible name stays `Remove header`, and its text is danger. The hint `Use * as wildcard. Protocol is optional.` stays, in secondary, at 12px.

Import and export messages, the 3 second dismissal, `role="status"`, `data-testid="import-export-status"`, and the disabled Export when there are no rules stay. Success text uses signal. Error text uses danger.

### Toolbar icons

`scripts/gen-icons.mjs` remains the generator, still imports `jimp` at 0.22, and writes the same three files: `public/icons/icon16.png`, `public/icons/icon48.png`, and `public/icons/icon128.png`. `npm run build` copies them to `dist/icons/`. Paths in `public/manifest.json` and in the service worker stay. Do not edit the service worker. The badge text, badge colors, and tooltip stay.

The mark, in a 16px grid, scaled by 3 for 48 and by 8 for 128: fill every pixel with signal `#0B5F4E`. Paint three white `#FFFFFF` bars, origin top-left: `x=3,y=4,w=10,h=2`; `x=3,y=8,w=7,h=2`; `x=3,y=11,w=4,h=2`. Pixel (0, 0) is signal. The pixel at the scaled point (3, 4) is white. The same pixels are used for ON and OFF.

### Behavior that stays

These strings and ids stay. Dev does not edit `e2e/**/*.spec.ts`.

| Id | Visible contract that stays |
|---|---|
| `global-toggle` | `title` `Disable extension` when on, `Enable extension` when off |
| `extension-disabled` | Exact text `(extension disabled)`, present only when the extension is off |
| `popup-rule` | `data-rule-name` is the rule name. Row shows that name and `urlPattern` |
| `popup-rule-toggle` | Still toggles that rule |
| `open-settings` | Label `Open settings` |
| Active count | Own element. Text is `${active} of ${total} rule` plus `s` only when `total !== 1`, then ` active`. Examples: `1 of 1 rule active`, `0 of 1 rule active`, `0 of 0 rules active` |
| `add-rule` | Label `Add rule` |
| `export-rules` / `import-rules` / `import-file` | Labels `Export` and `Import`. Export is disabled when there are no rules |
| `import-export-status` | Same messages as today, including `File is not valid JSON.` and `Imported 1 rule (skipped 1 invalid).` |
| `rule-card` | Shows method, status code, name, and URL pattern |
| `rule-edit` / `rule-delete` / `rule-delete-confirm` / `rule-delete-cancel` | Labels `Edit`, `Delete`, `Confirm`, `Cancel` |
| Form ids | `rule-name`, `rule-url-pattern`, `rule-method`, `rule-status-code`, `rule-response-body`, `rule-delay`, `add-header`, `header-row`, `header-key`, `header-value`, `remove-header`, `save-rule`, `cancel-rule` |
| Options empty | `No rules yet. Add your first rule.` and `Click "Add rule" above to get started.` |
| Popup empty | `No rules yet.` and `Open settings to add one.` |

New ids are `extension-state`, `rule-power`, `options-column`, and `popup-rule-list`. They mark the new state words and the two layout regions. They do not replace the ids above.

### Files to change

- `tailwind.config.js` — token colors, font family, and the three type steps
- `src/popup/Popup.tsx`, `src/popup/popup.css`, `src/popup/index.html` (the 280/320 body rule stays)
- `src/options/Options.tsx`, `src/options/options.css`, `src/options/index.html`
- `src/options/components/RuleList.tsx`, `RuleCard.tsx`, `RuleForm.tsx`, `ImportExportButtons.tsx`
- `scripts/gen-icons.mjs`
- `public/icons/icon16.png`, `icon48.png`, `icon128.png`
- `dist/` only as the output of `npm run icons` and `npm run build`

A presentational module under `src/shared/` is allowed if it contains no `chrome.storage` calls and `src/content/interceptor.ts` does not import it. Prefer the shared tokens in `tailwind.config.js`.

### Files that stay unchanged

These paths are not permission to edit:

- `src/content/interceptor.ts`, `src/content/bridge.ts`
- `src/background/service-worker.ts`
- `src/shared/types.ts`, `src/shared/storage.ts`
- `public/manifest.json`
- `package.json`, `package-lock.json`
- `e2e/**`
- Any spec other than this file

Popup and options components keep calling storage through `src/shared/storage.ts`. They do not call `chrome.storage` directly.

## Out of scope

- Request interception, URL matching, storage shape, and import/export parsing, file names, and timing
- New rule fields, a global switch on the options page, dark mode, or a webfont
- Renaming `MockRule`, the `rules` or `settings` storage keys, or the bridge source `__ninja_interceptor_bridge__`
- Toolbar badge text, badge colors, and tooltip
- New permissions, including `declarativeNetRequest`
- New npm dependencies
- Editing Playwright specs

## Acceptance criteria

1. Given the options page is open in a viewport at least 1000px wide, when the user looks at the page, then the page background is `rgb(244, 247, 248)`, the column `data-testid="options-column"` has a used width of 576px and left-aligned heading text, and the heading **API Response Simulator** is 20px with weight 600 and color `rgb(20, 32, 46)`. Given the popup is open, when the user looks at the surface behind the product name, then that surface is `rgb(255, 255, 255)`, the body max-width is 320px and min-width is 280px, and no background or text on either surface is `rgb(79, 70, 229)`. The popup product name is `rgb(20, 32, 46)`.

2. Given either surface, when the user reads the type, then button labels and the popup product name are 14px, the active-count line, URL patterns, the options subtitle, and import/export status are 12px, and the popup product name uses the UI stack (the computed font-family does not include `monospace`). Given the rule form, when the user looks at Name and URL pattern, then the URL pattern field’s font-family includes `monospace` and the Name field’s does not.

3. Given the extension is on, when the popup is shown, then `data-testid="extension-state"` is exactly `On` in color `rgb(11, 95, 78)`, the global switch `title` is `Disable extension`, its track is `rgb(11, 95, 78)`, the thumb’s horizontal center is to the right of the track’s center, and `data-testid="extension-disabled"` is not visible.

4. Given the user turns the global switch off, when the popup updates, then `extension-state` is exactly `Off` in color `rgb(20, 32, 46)`, the switch `title` is `Enable extension`, the track is `rgb(110, 124, 138)`, the thumb’s center is to the left of the track’s center, and `extension-disabled` is visible with the exact text `(extension disabled)` and that text is `rgb(20, 32, 46)`. Given the user turns it on again, when the popup updates, then criterion 3 is true again.

5. Given stored rules, when the popup is shown, then one element’s exact text is `${active} of ${total} rule` plus `s` only when `total !== 1`, then ` active`, and that element does not contain `(extension disabled)`. The count is 12px, weight 600, and color `rgb(20, 32, 46)`. With one enabled rule the text is `1 of 1 rule active`. After that rule is switched off it is `0 of 1 rule active`. With no rules it is `0 of 0 rules active`.

6. Given the extension is on and a rule is enabled, when the popup shows that row, then the row shows the rule name and URL pattern, `data-testid="rule-power"` is `On`, the name color is `rgb(20, 32, 46)`, the left border is 3px solid `rgb(11, 95, 78)`, the switch track is signal, and the switch’s accessible name is `Disable ${name}`. Given that rule is disabled, when the row is shown, then `rule-power` is `Off`, the name color is `rgb(62, 76, 90)`, the left border is 3px solid `rgb(107, 124, 140)`, the track is idle, and the accessible name is `Enable ${name}`. Given the extension is off and the rule is still enabled, when the popup is shown, then the name is secondary `rgb(62, 76, 90)`, the left border is 3px solid `rgb(107, 124, 140)`, `rule-power` is still exactly `On` in `rgb(62, 76, 90)`, the track is `rgb(110, 124, 138)`, the thumb’s center is still to the right of the track’s center, and the switch’s accessible name is still `Disable ${name}`.

7. Given there are no rules, when the popup is shown, then the user sees `No rules yet.` and `Open settings to add one.`, and **Open settings** is a button with background `rgb(11, 95, 78)` and white text. Given the user activates it, when the options page opens, then the heading **API Response Simulator** is visible. The rule list region `data-testid="popup-rule-list"` has max-height 256px.

8. Given the popup has at least one rule, when the user Tabs to the global switch, that rule’s switch, and **Open settings**, then each focused control’s outline is 2px solid `rgb(20, 32, 46)` with a 2px offset. **Open settings** has background `rgb(11, 95, 78)` and white text.

9. Given the options form is closed and at least one rule exists, when the user looks at the header, then **Add rule** has background `rgb(11, 95, 78)` and white text, and **Import** and **Export** have a white background, ink text, and a 1px solid `rgb(107, 124, 140)` border. Given the pointer hovers **Add rule**, when the button paints, then its background is `rgb(8, 74, 61)` and the label stays white. Given the form is open, when the user looks at the header, then **Add rule**, **Import**, and **Export** are not visible. Given the user cancels the form, when the header returns, then those three controls are visible again.

10. Given there are no rules, when the options page is shown, then `No rules yet. Add your first rule.` and `Click "Add rule" above to get started.` are visible, and **Export** is disabled, with secondary text, a line border, and computed opacity 1. Given two rules on a viewport at least 1000px wide, when the list is shown, then the second card’s left edge equals the first card’s left edge and its top is below the first card.

11. Given a saved rule, when its card is shown, then the method word uses the token color for that method (GET `rgb(20, 108, 67)`, POST `rgb(29, 78, 137)`, PUT `rgb(138, 90, 0)`, DELETE `rgb(155, 35, 48)`, PATCH `rgb(91, 58, 140)`, ANY `rgb(62, 76, 90)`), the status code is ink, the method and the status code have no background fill, and the card has no shadow and border-radius 0. **Edit** is a secondary button. **Delete** has danger text and a 1px danger border. An enabled card has an ink name, `rule-power` exactly `On` in signal `rgb(11, 95, 78)`, a signal track, the switch’s accessible name `Disable ${name}`, and a 3px signal left border. A disabled card has a secondary name, a 3px line left border, `rule-power` exactly `Off` in ink `rgb(20, 32, 46)`, an idle track, and the switch’s accessible name `Enable ${name}`, while the method word and status code keep the colors above and have no background fill. **Add rule** has border-radius 2px.

12. Given a rule card, when the user activates **Delete**, then the card shows `Are you sure?`, **Confirm**, and **Cancel**, and no browser confirm dialog opens. **Confirm** has background `rgb(155, 35, 48)` and white text. **Cancel** is a secondary button. Given the user activates **Cancel**, when the card settles, then the rule is still listed and **Delete** is back. Given the user activates **Delete** and then **Confirm**, when the list settles, then that rule is gone.

13. Given the user activates **Add rule**, when the form is shown, then the heading is `New rule` and the accessible names `Name`, `URL pattern`, `Method`, `Status code`, `Response body`, and `Delay (ms)` are on those fields. **Save rule** is a primary button. **Cancel** is a secondary button. **+ Add header** reads `+ Add header`. With no header rows, the form shows `No custom headers. Content-Type: application/json is always added.` Given a header row, when the user looks at it, then the key field’s accessible name is `Header name`, the value field’s is `Value`, and the remove control’s accessible name is `Remove header`. Given the user Tabs to the name field, the method field, and **Save rule**, then each shows the ink focus outline from criterion 8.

14. Given a successful export or import, when the status appears, then its text color is `rgb(11, 95, 78)`. Given an invalid JSON file, when import fails, then `data-testid="import-export-status"` has the exact text `File is not valid JSON.` and color `rgb(155, 35, 48)`. Given a file that imports one rule and skips one invalid entry, when import finishes, then the status text is exactly `Imported 1 rule (skipped 1 invalid).`

15. Given the options page has a rule and the form is closed, when the user Tabs to **Add rule**, **Import**, **Export**, the rule switch, **Edit**, and **Delete**, then each shows the ink focus outline from criterion 8.

16. Given a switch, when `prefers-reduced-motion` is not reduce, then the thumb’s transition duration is greater than 0s and at most 150ms. Given `prefers-reduced-motion: reduce`, when the switch is shown, then the thumb’s transition duration is 0s. Cards and rows do not animate in.

17. Given the packed icons `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png`, when a pixel is read, then pixel (0, 0) is `#0B5F4E` and the pixel at (3, 4), (9, 12), and (24, 32) respectively is `#FFFFFF`. The service worker still sets both ON and OFF to those same paths. Badge text stays `ON` or `OFF`, badge backgrounds stay `#137333` and `#5F6368`, and the tooltip stays `API Response Simulator: ON` or `API Response Simulator: OFF`.

18. Given the user saves a rule from the form, when the list returns, then a card shows that name, method, status code, and URL pattern. Given the user edits the response body and saves, when they open **Edit** again, then the body field shows the saved text. Given the user turns a rule off from the card and from the popup, when each surface is read, then that rule shows `Off` on both. Given the user exports and the download finishes, when the status is shown, then it matches today’s export sentence for that rule count (`Exported 1 rule.` or `Exported N rules.`).

## Edge cases

- No rules and the extension on: count `0 of 0 rules active`, empty popup copy, no `(extension disabled)`, header `On`, **Open settings** still signal.
- No rules and the extension off: the same empty copy, header `Off`, and `(extension disabled)`.
- Extension off while a rule is enabled: popup row chrome is inactive and `rule-power` stays `On`. Options card for that rule stays in the enabled look.
- A disabled rule on the options page keeps a full-contrast method word and status code.
- A long name or URL pattern truncates inside the row and does not widen the popup past 320px.
- Several rules scroll inside `popup-rule-list` rather than growing the popup without a bound.
- Delete then Cancel leaves the rule. Confirm removes only that rule.
- Export with no rules stays disabled. Export and import status still clear on their own.
- Opening the form hides **Add rule**, **Import**, and **Export**. Cancel brings them back.
- `delayMs` of 0 shows no delay note. A positive delay still shows `${delayMs}ms delay`.
- The loading popup still shows `Loading…` before rules and settings resolve.
- A rule name with quotes or angle brackets still renders as text.

## Coverage matrix

Filled by role-tester. Leave this table empty in the spec draft.

| Criterion | Test | Status |
|---|---|---|
| AC-1 Shared palette and heading type | `AC-1: options page and popup use the shared palette and heading type` | pass |
| AC-2 Type scale and monospace URL pattern | `AC-2: controls are 14px, meta text is 12px, and only the URL pattern is monospace` | pass |
| AC-3 Extension on | `AC-3: extension on shows On, a signal track, and the thumb on the right` | pass |
| AC-4 Extension off and back on | `AC-4: turning the extension off shows Off and turning it on restores On` | pass |
| AC-5 Active count | `AC-5: the active count is its own 12px ink line` | pass |
| AC-6 Popup row chrome | `AC-6: popup rows show live, disabled, and extension-off chrome` | pass |
| AC-7 Empty popup and Open settings | `AC-7: an empty popup offers a primary Open settings button` | pass |
| AC-8 Popup focus outline | `AC-8: tabbing the popup shows the ink focus outline` | pass |
| AC-9 Options header buttons | `AC-9: Add rule is primary, import and export are secondary, and the form hides them` | pass |
| AC-10 Empty options and one column | `AC-10: the empty options state and a single column of cards` | pass |
| AC-11 Rule card colors and power | `AC-11: rule cards use method colors, power, and button styles` | pass |
| AC-12 Inline delete | `AC-12: delete confirms inline without a browser dialog` | pass |
| AC-13 Rule form | `AC-13: the rule form exposes its fields and the ink focus outline` | pass |
| AC-14 Import and export status colors | `AC-14: import and export status use signal and danger` | pass |
| AC-15 Options focus outline | `AC-15: tabbing the options page shows the ink focus outline` | pass |
| AC-16 Thumb motion | `AC-16: the switch thumb transition is at most 150ms and reduced motion is instant` | pass |
| AC-17 Toolbar icons, badge, and tooltip | `AC-17: toolbar icons, badge, and tooltip` | pass |
| AC-18 Save, edit, Off, and export count | `AC-18: saved rules stay in sync and export reports the count` | pass |

## Test notes

Popup and options are the pages under test. Use a rule with a name, a URL pattern, a method, a status code, a response body, and a delay of 0, plus a second rule when the one-column list or the plural count matters. Turn the popup switch off to see `(extension disabled)` and the inactive row. Delete from a card and cancel once before confirming. Import one valid JSON file and one invalid file to see the status colors. Tab to a switch and a button on each page for the focus outline. The toolbar icon check can read the extension’s `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png`. Badge text and tooltip are the existing ON/OFF behavior.

## QA review

Requirements review only (round 2 of 2). No acceptance check. Round 1 findings were checked against this revised spec. The current popup and options source were read again for strings, colors, and controls the spec still leaves open. The restyled screens were not built, so the new layout was not seen in the browser. Named hex pairs were checked on white; the composed popup at 280px was not rendered.

**Verdict:** APPROVE

**Biggest risk:** An enabled options card still uses signal green while the extension is off, and the popup can still read `1 of 1 rule active` under a header that says Off. A user who looks at the options page, or who reads “active” as “intercepting,” can still think a saved-on rule is live. The popup row itself uses no signal green in that case.

**Findings:**

1. [High] resolved. A saved-on popup row while the extension is off is secondary word, idle track, line bar, and secondary name. The thumb stays to the right and the word stays `On`. Assumptions, the visual system, the Popup section, and criterion 6 all say this. Options cards still use signal while the extension is off, and the spec says that is intentional.
   Suggested rewrite: None.

2. [Med] resolved. The popup product name and `(extension disabled)` are ink `#14202E`. Criterion 1 checks the name. Criterion 4 checks the disabled sentence.
   Suggested rewrite: None.

3. [Med] resolved. The count is how many rules have `enabled` true, over how many rules exist. Turning the extension off does not change the numbers. `1 of 1 rule active` beside header Off means one rule is saved on and none are intercepting.
   Suggested rewrite: None.

4. [Med] resolved. An enabled options card requires `On` in signal, a signal track, `Disable ${name}`, and a signal bar. Method and status are plain words with no fill. The empty state has no emoji. `+ Add header` is a secondary button. The remove control’s text is danger. The URL hint is secondary at 12px. Criterion 11 includes the enabled card and no background fill on the method or the status code.
   Suggested rewrite: None.

5. [Med] resolved. The header is one row, the product name truncates with an ellipsis, and `extension-state` and the global switch stay fully visible. **Open settings** is a primary button when the list is empty and when it has rules. Criterion 8 checks that fill when rules exist.
   Suggested rewrite: None.

6. [Low] still open. The edge case still says a long name or URL pattern “truncates.” A wrapped line that is cut off can pass. A 2px outline with a 2px offset on a switch inside the 256px list can be clipped, so the computed outline passes while the user sees no ring. The header name’s ellipsis does not cover rule rows.
   Suggested rewrite: In Edge cases, replace the long-name bullet with: “A long name or URL pattern stays on one line and ends in an ellipsis. The row does not widen the popup past 320px. Padding inside `popup-rule-list` keeps the 2px focus outline and its 2px offset fully inside the scrollport for the first and last row.”

7. [Low] still open. The options rule switch can keep `title` `Disable rule` / `Enable rule` next to the new accessible name `Disable ${name}`. **Add rule** can keep the extra plus. Loading is still only the string `Loading…`, with no color and no rule that the header is absent. Today’s loading view is already that sentence alone, in gray, so a restyle can put a header behind it and still match the spec.
   Suggested rewrite: In Behavior that stays, add: “A rule switch has no `title`. The accessible name is its only name. The **Add rule** label is exactly `Add rule`, with no plus glyph. While rules and settings are still loading, the popup shows only `Loading…`, centered, in secondary `#3E4C5A`, and shows no header.”

8. [Low] still open. When the extension is on and the rule is disabled, popup `rule-power` is `Off` with no color. Options Off is ink. A popup word while the extension is off is secondary. This case is neither, so the new Off word can ship in the old gray.
   Suggested rewrite: In the Popup section, after the live-bar paragraph, add: “When the extension is on and the rule is disabled, `rule-power` is `Off` in ink `#14202E`.” In criterion 6, replace “then `rule-power` is `Off`” with “then `rule-power` is `Off` in ink `rgb(20, 32, 46)`.”

9. [Low] still open. `No rules yet.` and `Open settings to add one.` have no color, size, or alignment. Today they are 12px `#9CA3AF` and centered. That gray on white is 2.54:1. The options empty sentences now have ink and secondary colors. These two can stay faint and criterion 7 still passes.
   Suggested rewrite: In the Popup section, after the empty-copy sentence, add: “Both sentences are left aligned. `No rules yet.` is ink `#14202E` at 14px. `Open settings to add one.` is secondary `#3E4C5A` at 12px.”

## Manual verification steps

Filled by role-tester after implementation. About five minutes, with the unpacked extension loaded from `dist/`. These checks are the ones the suite does not judge by eye: spacing, the switch pill, icon appearance, and the status line clearing itself.

1. At `chrome://extensions`, click Reload on this extension. Open the popup with no rules. — Expected: the surface behind **API Response Simulator** is white, with no indigo bar. **On** is deep teal beside a teal pill switch, thumb on the right, and the corners outside the pill match the white popup. The count is `0 of 0 rules active` in dark ink. `No rules yet.` and `Open settings to add one.` are left aligned. **Open settings** is a full-width teal button with white text. The popup stays about 280–320px wide, and the gap from the header to the count to the empty copy to the button is even.

2. Click **Open settings**. — Expected: the page background is a cool light gray. One column is centered, the heading **API Response Simulator** is larger than the body text and left aligned, and the subtitle is `Manage your HTTP mock rules`. **Add rule** is teal with white text. **Import** and **Export** are white with dark text and a gray border. Both empty sentences are left aligned. **Export** is disabled and still full contrast, not faded.

3. Add one rule: name `Users`, URL pattern `localhost:8080/api/*`, method GET, status `200`, body `{"ok":true}`, delay `0`. Save. — Expected: the form closes and **Add rule**, **Import**, and **Export** return. The card is white, square, and has no shadow, with a teal 3px left edge. GET is green with no filled chip, `200` is dark ink with no chip, the name is dark, the pattern is smaller, **On** is teal, and the thumb is on the right. **Edit** is a white button. **Delete** is red text with a red border. Padding inside the card looks even.

4. Hover **Add rule**, then Tab through **Add rule**, **Import**, **Export**, the rule switch, **Edit**, and **Delete**. — Expected: hovered **Add rule** turns a darker teal and the label stays white. Each focused control shows a dark 2px outline set slightly outside the control.

5. Open the popup. Turn the header switch off. — Expected: before the click, the count is `1 of 1 rule active`, the row shows `Users`, the pattern, teal **On**, a teal bar, and the thumb on the right, and **Open settings** is still the teal button. After the click, **Off** is dark ink, the header track is gray, that thumb is on the left, and `(extension disabled)` is dark ink under the count. The count stays `1 of 1 rule active`. The row name and the word **On** are muted, the row bar and track are gray, and that thumb stays on the right. Both switches still read as pills.

6. Turn the extension on, then turn that rule’s switch off. On the options page, click **Delete**, then **Cancel**, then **Delete**, then **Confirm**. — Expected: the popup row says **Off**, the name is muted, the bar and track are gray, the thumb is on the left, and the count is `0 of 1 rule active`. The options card for that rule also says **Off**, while GET and the status code stay full color. Delete shows `Are you sure?`, a red **Confirm** button with white text, and a white **Cancel** button, with no browser dialog. Cancel restores **Delete** and keeps the rule. Confirm removes only that rule.

7. Add the rule from step 3 again. Click **Export**, then **Import** a file that is not JSON, and watch the status line. Close the popup and look at the toolbar icon, then turn the extension off and look again. — Expected: `Exported 1 rule.` is teal, then `File is not valid JSON.` is red, and that status line disappears on its own after about three seconds. The toolbar icon is the same teal field with three white bars for ON and for OFF. The badge reads `ON` or `OFF`, and the tooltip is `API Response Simulator: ON` or `API Response Simulator: OFF`.

## Definition of done

- [ ] Spec accepted by the human
- [ ] A QA requirements review was completed; findings accepted or spec updated
- [ ] DEV implemented the spec without changing the acceptance criteria
- [ ] role-tester acceptance check completed; findings addressed by DEV
- [ ] Human ran the Manual verification steps
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` were run and the output is in the PR
- [ ] Human reviewed and merged the PR
- [ ] A row was added to `docs/agent-runs.csv`
