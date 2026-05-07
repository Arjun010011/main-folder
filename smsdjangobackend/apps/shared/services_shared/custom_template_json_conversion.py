import math
import copy
import re

# -------------------------------------------------
# CONSTANTS
# -------------------------------------------------

LAYOUT_VERSION = 2

PAGE_SIZES_MM = {
    "A4": {"width": 210, "height": 297},
    "A5": {"width": 148, "height": 210},
    "A3": {"width": 297, "height": 420},
}

MM_TO_PX = 3.7795275591

DEFAULT_SIZE_BY_TYPE = {
    "label": {"width": 200, "height": 24},
    "value": {"width": 200, "height": 24},
    "table": {"width": None, "height": 200},
    "image": {"width": 100, "height": 100},
    "shape": {"width": 80, "height": 80},
}

# -------------------------------------------------
# HELPERS
# -------------------------------------------------

def margin_to_object(m):
    if m is None:
        return {"top": 0, "right": 0, "bottom": 0, "left": 0}

    if isinstance(m, (int, float)):
        return {"top": m, "right": m, "bottom": m, "left": m}

    return {
        "top": m.get("top", 0) if isinstance(m.get("top"), (int, float)) else 0,
        "right": m.get("right", 0) if isinstance(m.get("right"), (int, float)) else 0,
        "bottom": m.get("bottom", 0) if isinstance(m.get("bottom"), (int, float)) else 0,
        "left": m.get("left", 0) if isinstance(m.get("left"), (int, float)) else 0,
    }


def to_exact_number(v, fallback):
    if v is None:
        return fallback

    if isinstance(v, (int, float)):
        return v

    if isinstance(v, str):
        try:
            return float(re.sub(r"\s*px$", "", v.strip(), flags=re.I))
        except:
            return fallback

    return fallback


def is_numeric_or_px(v):
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return True
    if isinstance(v, str):
        return bool(re.match(r"^\d+(\.\d+)?(\s*px?)?$", v.strip(), re.I))
    return False


# -------------------------------------------------
# JS BLOCK EQUIVALENT (Your normalize block)
# -------------------------------------------------

def normalize_root_children(template_data):
    if not template_data:
        return template_data

    root = template_data.get("root")
    if not root or not isinstance(root.get("children"), list):
        return template_data

    new_children = []

    for child in root["children"]:

        # TABLE
        if child.get("type") == "table":
            th = child.get("th") if child.get("th") is not None else child.get("tableCss", {}).get("th", {})
            tr = child.get("tr") if child.get("tr") is not None else child.get("tableCss", {}).get("tr", {})
            td = child.get("td") if child.get("td") is not None else child.get("tableCss", {}).get("td", {})

            new_children.append({
                **child,
                "th": th or {},
                "tr": tr or {},
                "td": td or {},
            })
            continue

        # SHAPE
        if child.get("type") == "shape":
            shape_kind = child.get("shapeKind")
            if shape_kind not in ["rect", "circle", "ellipse", "line"]:
                shape_kind = "rect"

            new_children.append({
                **child,
                "shapeKind": shape_kind,
                "backgroundColor": child.get("backgroundColor", "transparent"),
                "borderColor": child.get("borderColor", "#000000"),
                "borderWidth": child.get("borderWidth") if child.get("borderWidth") is not None else 1,
                "borderStyle": child.get("borderStyle", "solid"),
                "borderRadius": child.get("borderRadius") if child.get("borderRadius") is not None else 0,
            })
            continue

        # ROW
        if child.get("type") == "row" and isinstance(child.get("children"), list):
            new_children.append({
                **child,
                "flexDirection": child.get("flexDirection") or "row",
                "gap": child.get("gap") if child.get("gap") is not None else 8,
                "alignItems": child.get("alignItems") or "stretch",
                "justifyContent": child.get("justifyContent") or "flex-start",
                "children": child.get("children"),
            })
            continue

        new_children.append(child)

    return {
        **template_data,
        "root": {
            **root,
            "children": new_children,
        },
    }


# -------------------------------------------------
# ELEMENT SERIALIZER (Exact JS Logic)
# -------------------------------------------------

def serialize_element(el, page_width_px, page_height_px):
    el = copy.deepcopy(el)

    margin = margin_to_object(el.get("margin"))
    el_type = el.get("type") or "label"
    defaults = DEFAULT_SIZE_BY_TYPE.get(el_type, DEFAULT_SIZE_BY_TYPE["label"])

    width_raw = el.get("width", "auto")
    height_raw = el.get("height")

    if is_numeric_or_px(width_raw):
        width_px = to_exact_number(width_raw, defaults["width"])
    elif width_raw == "100%":
        width_px = round(page_width_px)
    else:
        width_px = defaults["width"] if defaults["width"] else round(page_width_px)

    if height_raw is not None and is_numeric_or_px(height_raw):
        height_px = to_exact_number(height_raw, defaults["height"])
    elif height_raw == "100%":
        height_px = round(page_height_px)
    else:
        height_px = defaults["height"]

    padding_val = el.get("padding", 5)
    font_size_val = el.get("fontSize", 14)
    border_width_val = el.get("borderWidth", 0)
    border_radius_val = el.get("borderRadius", 0)

    styles = {
        "marginTop": margin["top"],
        "marginRight": margin["right"],
        "marginBottom": margin["bottom"],
        "marginLeft": margin["left"],
        "paddingTop": padding_val,
        "paddingRight": padding_val,
        "paddingBottom": padding_val,
        "paddingLeft": padding_val,
        "width": width_px,
        "height": height_px,
        "fontSize": font_size_val,
        "color": el.get("color", "#000000"),
        "backgroundColor": el.get("backgroundColor", "transparent"),
        "fontWeight": el.get("fontWeight", "normal"),
        "fontStyle": el.get("fontStyle", "normal"),
        "textDecoration": el.get("textDecoration", "none"),
        "fontFamily": el.get("fontFamily", "Arial, sans-serif"),
        "textAlign": el.get("textAlign", "left"),
        "borderWidth": border_width_val,
        "borderColor": el.get("borderColor", "#000000"),
        "borderStyle": el.get("borderStyle", "solid"),
        "borderRadius": border_radius_val,
        "boxSizing": "border-box",
        "overflow": "hidden",
    }

    out = {
        "id": el.get("id"),
        "type": el_type,
        "margin": margin,
        "padding": padding_val,
        "width": width_px,
        "height": height_px,
        "dataPath": el.get("dataPath", ""),
        "text": el.get("text", ""),
        "styles": styles,
    }

    # TABLE
    if el_type == "table":
        cols = el.get("selectedColumns", [])
        headers = el.get("columnHeaders", {})

        out["columns"] = [
            {
                "key": str(key),
                "label": headers.get(key, key.replace("_", " ").title())
            }
            for key in cols
        ]

        col_count = len(cols)

        if col_count > 0:
            per_col = math.floor(width_px / col_count)
            widths = [per_col] * col_count
            remainder = width_px - per_col * col_count
            if remainder > 0:
                widths[0] += remainder
            out["columnWidthsPx"] = widths
        else:
            out["columnWidthsPx"] = []

        out["tableCss"] = el.get("tableCss", {})
        out["th"] = {**el.get("th", {}), **el.get("thCss", {})}
        out["tr"] = {**el.get("tr", {}), **el.get("trCss", {})}
        out["td"] = {**el.get("td", {}), **el.get("tdCss", {})}


    # ROW
    if el_type == "row" and isinstance(el.get("children"), list):
        out["flexDirection"] = el.get("flexDirection", "row")
        out["gap"] = el.get("gap", 8)
        out["alignItems"] = el.get("alignItems", "stretch")
        out["justifyContent"] = el.get("justifyContent", "flex-start")
        out["children"] = [
            serialize_element(child, page_width_px, page_height_px)
            for child in el["children"]
        ]

    if el_type == "image":
        out["imageUrl"] = el.get("imageUrl", "")

    if el_type == "shape":
        out["shapeKind"] = el.get("shapeKind", "rect")

    return out


# -------------------------------------------------
# MAIN SERIALIZER
# -------------------------------------------------

def serialize_template_data_for_backend(template_data):

    # 1️⃣ Apply your JS normalize block first
    template_data = normalize_root_children(template_data)

    flow = template_data or {}
    root = flow.get("root", {})

    page_size_key = flow.get("pageSize", "A4")
    page_mm = PAGE_SIZES_MM.get(page_size_key, PAGE_SIZES_MM["A4"])

    page_width_px = round(page_mm["width"] * MM_TO_PX)
    page_height_px = round(page_mm["height"] * MM_TO_PX)

    root_padding = root.get("padding", 0)

    content_width_px = max(0, page_width_px - 2 * root_padding)
    content_height_px = max(0, page_height_px - 2 * root_padding)

    children = root.get("children", [])

    serialized_children = [
        serialize_element(el, content_width_px, content_height_px)
        for el in children
    ]

    return {
        "layoutVersion": 2,
        "pageSize": page_size_key,
        "pageBg": flow.get("pageBg", "#ffffff"),
        "pageWidthMm": page_mm["width"],
        "pageHeightMm": page_mm["height"],
        "root": {
            "id": root.get("id", "root"),
            "type": root.get("type", "section"),
            "margin": margin_to_object(root.get("margin")),
            "padding": root_padding,
            "gap": root.get("gap", 8),
            "flexDirection": root.get("flexDirection", "column"),
            "alignItems": root.get("alignItems", "stretch"),
            "justifyContent": root.get("justifyContent", "flex-start"),
            "children": serialized_children,
        }
    }
