# Backend Payload: JSON for HTML/PDF Generation

The frontend sends a **POST** body that the backend can parse and use to generate HTML, then PDF.

---

## Request body (JSON)

```json
{
  "template_data": { ... },
  "sample_data": { ... }
}
```

- **template_data**: Flow layout (layoutVersion 2). All values are JSON-serializable (no `undefined`).
- **sample_data**: Plain object for `dataPath` resolution (e.g. student/institute data). Stripped of `undefined` via `JSON.parse(JSON.stringify(...))`.

---

## template_data shape

Backend can rely on this structure. All fields are present with consistent types.

```json
{
  "layoutVersion": 2,
  "pageSize": "A5",
  "pageBg": "#ffffff",
  "pageWidthMm": 148,
  "pageHeightMm": 210,
  "root": {
    "id": "root",
    "type": "section",
    "margin": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
    "padding": 0,
    "gap": 8,
    "flexDirection": "column",
    "alignItems": "stretch",
    "justifyContent": "flex-start",
    "children": [ ... ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| layoutVersion | number | Always `2` |
| pageSize | string | `"A4"` \| `"A5"` \| `"A3"` |
| pageBg | string | CSS color (e.g. `"#ffffff"`) |
| pageWidthMm | number | Exact page width in mm (A5: 148, A4: 210, A3: 297) |
| pageHeightMm | number | Exact page height in mm (A5: 210, A4: 297, A3: 420) |
| root | object | Single root container |
| root.id | string | `"root"` |
| root.type | string | `"section"` |
| root.margin | object | `{ top, right, bottom, left }` (numbers, px) |
| root.padding | number | px |
| root.gap | number | px between children |
| root.flexDirection | string | `"column"` \| `"row"` |
| root.alignItems | string | e.g. `"stretch"` |
| root.justifyContent | string | e.g. `"flex-start"` |
| root.children | array | Content elements and row containers |

---

## root.children[] — content element or row

Each item is one of: **label**, **value**, **image**, **table**, **shape**, **row**. Types are consistent; optional fields are present with defaults.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique id |
| type | string | `"label"` \| `"value"` \| `"image"` \| `"table"` \| `"shape"` |
| margin | object | `{ top, right, bottom, left }` (numbers) |
| padding | number | px |
| width | number \| string | Exact px (number) when numeric, or `"auto"` / `"100%"` |
| height | number \| string \| (omitted) | Exact px (number) when numeric, or omitted for label/value |
| dataPath | string | Dot path into sample_data (e.g. `"data.student_list.0.student_name"`) |
| text | string | Static text (label) |
| fontSize | number | px |
| color | string | CSS color |
| backgroundColor | string | CSS color |
| fontWeight | string | e.g. `"normal"` |
| fontStyle | string | e.g. `"normal"` |
| textDecoration | string | e.g. `"none"` |
| fontFamily | string | e.g. `"Arial, sans-serif"` |
| textAlign | string | `"left"` \| `"center"` \| `"right"` |
| borderWidth | number | px |
| borderColor | string | CSS color |
| borderStyle | string | e.g. `"solid"` |
| borderRadius | number | px |
| selectedColumns | array | Column keys for table (e.g. `["subject_name","marks"]`) |
| columnHeaders | object | `{ "column_key": "Display Label" }` for table |
| styles | object | **All CSS** for the element — nothing skipped (see below) |

- **label**: use `text`; `dataPath` can be empty.
- **value**: use `dataPath` to read from `sample_data`; `text` ignored.
- **image**: use `dataPath` for image URL; optional `width`/`height`.
- **table**: use `dataPath` for array of rows; use **columns**, **tableCss**, **columnWidthsPx** for correct cols/rows CSS (see below).
- **shape**: use **shapeKind**, **backgroundColor**, **borderColor**, **borderWidth**, **borderStyle**, **borderRadius**; render as SVG or CSS (rect, circle, ellipse, line).
- **row**: container for horizontal layout; has **children** array containing content elements; use **flexDirection**, **gap**, **alignItems**, **justifyContent** for layout.

### Row-only fields (when type === "row")

| Field | Type | Description |
|-------|------|-------------|
| children | array | Array of content elements (label, value, image, table, shape) — nested elements inside the row |
| flexDirection | string | `"row"` (horizontal layout) |
| gap | number | Space (px) between children |
| alignItems | string | Vertical alignment: `"stretch"` \| `"flex-start"` \| `"center"` \| `"flex-end"` |
| justifyContent | string | Horizontal alignment: `"flex-start"` \| `"center"` \| `"flex-end"` \| `"space-between"` |

Row elements also have **width**, **height**, **margin**, **padding**, and **styles** like other elements. Row **children** are recursively serialized with the same structure as root.children.

### Shape-only fields (when type === "shape")

| Field | Type | Description |
|-------|------|-------------|
| shapeKind | string | `"rect"` \| `"circle"` \| `"ellipse"` \| `"line"` — kind of shape to draw |
| backgroundColor | string | Fill color (CSS color) |
| borderColor | string | Stroke/border color (CSS color) |
| borderWidth | number | Stroke/border width (px) |
| borderStyle | string | e.g. `"solid"` |
| borderRadius | number | Corner radius (px); used for rect only |

All shape elements also have **width**, **height**, **margin**, **padding**, and **styles** like other content elements.

### Table-only fields (when type === "table")

| Field | Type | Description |
|-------|------|-------------|
| columns | array | `[{ key: string, label: string }, ...]` — column order and header labels |
| numCols | number | Number of columns |
| tableCss | object | CSS values for table/thead/tbody/th/td (see below) |
| columnWidthsPx | array | `[number, ...]` — exact width (px) per column, one per column |

**tableCss** shape:

| Key | Type | Description |
|-----|------|-------------|
| borderCollapse | string | `"collapse"` |
| borderWidth | number | px |
| borderColor | string | CSS color |
| borderStyle | string | e.g. `"solid"` |
| cellPaddingPx | number | Padding (px) for th/td |
| fontSize | number | px |
| headerBackgroundColor | string | CSS color for thead th |
| headerRowHeightPx | number | Height (px) of header row |
| rowHeightPx | number | Height (px) of each data row |
| tableLayout | string | `"fixed"` |
| widthPx | number | Total table width (px) |
| heightPx | number | Total table height (px) |

**tableCss** includes all base CSS plus **th**, **tr**, **td** objects:

- **tableCss.th** — full CSS for `<th>`: `borderWidth`, `borderColor`, `borderStyle`, `padding`, `backgroundColor`, `color`, `fontSize`, `fontWeight`, `fontFamily`, `textAlign`, `height`, `boxSizing`, `wordWrap`, `overflow`.
- **tableCss.tr** — full CSS for `<tr>`: `height`, `borderWidth`, `borderColor`, `borderStyle` (and any other tr-level styles).
- **tableCss.td** — full CSS for `<td>`: `borderWidth`, `borderColor`, `borderStyle`, `padding`, `color`, `fontSize`, `fontFamily`, `textAlign`, `height`, `boxSizing`, `wordWrap`, `wordBreak`, `overflow`, `whiteSpace`.

**Extra keys on table element (type === "table"):**

- **tr** — same CSS object as `tableCss.tr`; use for `<tr>` inline style.
- **td** — same CSS object as `tableCss.td`; use for `<td>` inline style.

Backend can use **element.tr** and **element.td** (or **tableCss.tr** / **tableCss.td**) to apply styles to each `<tr>` and `<td>`. Numeric values for padding, height, fontSize, borderWidth are in px.

### styles object (every element)

Every element has a **styles** object with all CSS properties (nothing skipped):

| Key | Type | Description |
|-----|------|-------------|
| marginTop, marginRight, marginBottom, marginLeft | number | px |
| paddingTop, paddingRight, paddingBottom, paddingLeft | number | px |
| width, height | number | px |
| fontSize | number | px |
| color, backgroundColor | string | CSS color |
| fontWeight, fontStyle, textDecoration | string | CSS values |
| fontFamily, textAlign | string | |
| borderWidth, borderRadius | number | px |
| borderColor, borderStyle | string | |
| boxSizing, overflow | string | |
| lineHeight, letterSpacing | string/number | |
| verticalAlign, alignSelf | string | |
| minWidth, maxWidth, minHeight, maxHeight | number/string | |
| wordWrap, wordBreak, whiteSpace | string | |

Use **styles** to build inline CSS for the element; do not skip any key.

---

## sample_data shape

Arbitrary JSON. Backend resolves `dataPath` by splitting on `.` and traversing (e.g. `data.student_list.0.student_name` → `sample_data.data.student_list[0].student_name`).

---

## Backend parsing (pseudo-code)

```python
# Example: Django / Flask
body = request.get_json()
template_data = body["template_data"]
sample_data = body["sample_data"]

assert template_data["layoutVersion"] == 2
root = template_data["root"]
page_size = template_data["pageSize"]
page_bg = template_data["pageBg"]
children = root["children"]

# Build HTML from root + children; resolve dataPath against sample_data
html = build_html(template_data, sample_data)
pdf = html_to_pdf(html)
return pdf
```

---

## Example minimal template_data

```json
{
  "layoutVersion": 2,
  "pageSize": "A5",
  "pageBg": "#ffffff",
  "root": {
    "id": "root",
    "type": "section",
    "margin": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
    "padding": 16,
    "gap": 8,
    "flexDirection": "column",
    "alignItems": "stretch",
    "justifyContent": "flex-start",
    "children": [
      {
        "id": "el_1",
        "type": "label",
        "margin": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
        "padding": 5,
        "width": "100%",
        "text": "Student Name",
        "fontSize": 14,
        "color": "#000000",
        "backgroundColor": "transparent",
        "fontWeight": "normal",
        "fontStyle": "normal",
        "textDecoration": "none",
        "fontFamily": "Arial, sans-serif",
        "textAlign": "left",
        "borderWidth": 0,
        "borderColor": "#000000",
        "borderStyle": "solid",
        "borderRadius": 0,
        "dataPath": "",
        "selectedColumns": [],
        "columnHeaders": {}
      },
      {
        "id": "el_2",
        "type": "value",
        "margin": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
        "padding": 5,
        "width": "100%",
        "dataPath": "data.student_list.0.student_name",
        "text": "",
        "fontSize": 14,
        "color": "#000000",
        "backgroundColor": "transparent",
        "fontWeight": "normal",
        "fontStyle": "normal",
        "textDecoration": "none",
        "fontFamily": "Arial, sans-serif",
        "textAlign": "left",
        "borderWidth": 0,
        "borderColor": "#000000",
        "borderStyle": "solid",
        "borderRadius": 0,
        "selectedColumns": [],
        "columnHeaders": {}
      }
    ]
  }
}
```

The frontend uses `serializeTemplateDataForBackend(getFlowTemplateData(raw))` so the backend always receives this parseable shape.
