# Flow Layout: Margin-Based, Drag-and-Drop Only

## Summary

- **Positioning**: No `x`/`y`. Elements are laid out in **document order** with **margin** (and optional padding/gap).
- **Movement**: **Drag-and-drop only** — reorder elements in the list; spacing is controlled by **Margin Top** and **Margin Left** in the sidebar.
- **React preview** and **backend HTML → PDF** use the same flow layout for consistent output.

---

## 1. Element schema (layoutVersion 2)

**Template root:**
```json
{
  "layoutVersion": 2,
  "pageSize": "A5",
  "pageBg": "#ffffff",
  "root": {
    "id": "root",
    "type": "section",
    "margin": 0,
    "padding": 0,
    "gap": 8,
    "flexDirection": "column",
    "alignItems": "stretch",
    "justifyContent": "flex-start",
    "children": [ ... ]
  }
}
```

**Content elements** (label, value, image, table): no `x`/`y`. Use:
- `margin` — number or `{ top, right, bottom, left }` (px)
- `padding` — number or object
- `width`, `height` — number (px) or string (e.g. `"100%"`)
- `dataPath`, `text`, `fontSize`, `color`, typography, borders, etc.

**Example content element:**
```json
{
  "id": "el_1",
  "type": "value",
  "margin": { "top": 8, "left": 0, "right": 0, "bottom": 0 },
  "padding": 5,
  "width": "100%",
  "dataPath": "data.student_list.0.student_name",
  "fontSize": 14,
  "color": "#000000"
}
```

---

## 2. Layout logic

- **Flow**: Children of the root (and any nested section/row/column) are laid out in **order**; each child gets `margin` + `padding` + `width`/`height`. **Gap** adds space between siblings.
- **Box model**: `boxSpacingToCss(margin)` and `boxSpacingToCss(padding)` turn numbers or `{ top, right, bottom, left }` into CSS (e.g. `"8px 0 0 0"`).
- **Movement**: Only by **drag-and-drop** — reorder the `children` array. Visual position = order + margin; no X/Y inputs.

---

## 3. Migration (absolute → relative)

- **Detection**: Legacy = `template_data.elements` with at least one element having `x` or `y`.
- **Migration**: `migrateAbsoluteToRelative(template_data)` sorts elements by `y` then `x`, builds one root section, sets each element’s `margin.top`/`margin.left` so the flow matches the old layout, and removes `x`/`y`.
- **When**: On load (saved template or predefined); on print, `getFlowTemplateData(raw)` ensures the backend always receives v2 (migrated if legacy).

---

## 4. React render

- **LayoutRenderer** (`LayoutRenderer.jsx`): Renders `template_data` (v1 or v2; v1 auto-migrated) with flex + margin/padding/gap. Used for the **preview modal** and any print preview.
- **Design canvas**: Single flex column; each element is a div with `element.margin`, `element.padding`, `element.width`, `element.height`. **Drag-and-drop** reorders; **Margin Top/Left** in the sidebar control spacing. No X/Y; no Move up/down buttons.

---

## 5. HTML/CSS for PDF

- **layoutPdfHtml.js** exports `buildPdfHtml(template_data, sample_data, options)` — same structure as LayoutRenderer, print-safe CSS (`box-sizing`, mm, `print-color-adjust`). Backend can use this HTML to generate PDF.

---

## 6. How margin-based positioning works

- **Before**: `left: xpx; top: ypx` — moving one element didn’t affect others.
- **After**: Position = **order in the list** + **margin**. `margin.top` adds space above the element (from the previous one); `margin.left` indents. **Drag-and-drop** changes order; **Margin Top/Left** change spacing. Changing one element’s margin or size only shifts what comes **after** it in the flow.

---

## 7. Files

| File | Purpose |
|------|--------|
| `layoutSchema.js` | Migration, `getFlowTemplateData`, `boxSpacingToCss`, `createContentElement` |
| `LayoutRenderer.jsx` | Flow preview/print renderer |
| `layoutPdfHtml.js` | `buildPdfHtml()` for backend PDF |
| `Design.jsx` | Flow canvas, margin sidebar, drag-only reorder, LayoutRenderer preview |
| `DesignPrint.jsx` | Sends `getFlowTemplateData(raw)` to backend |
