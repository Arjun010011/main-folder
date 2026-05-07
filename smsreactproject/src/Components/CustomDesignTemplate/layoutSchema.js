/**
 * Flow layout schema for PDF templates.
 * Positioning is margin-based (no x, y). Movement = drag-and-drop reorder only.
 */

export const LAYOUT_VERSION = 2;

/** Exact page dimensions in mm for backend (A3, A4, A5). */
export const PAGE_SIZES_MM = { A4: { width: 210, height: 297 }, A5: { width: 148, height: 210 }, A3: { width: 297, height: 420 } };

export function boxSpacingToCss(v, unit = 'px') {
    if (v == null) return '0';
    if (typeof v === 'number') return `${v}${unit}`;
    if (typeof v === 'string') return v;
    const t = v.top != null ? `${v.top}${typeof v.top === 'number' ? unit : ''}` : '0';
    const r = v.right != null ? `${v.right}${typeof v.right === 'number' ? unit : ''}` : '0';
    const b = v.bottom != null ? `${v.bottom}${typeof v.bottom === 'number' ? unit : ''}` : '0';
    const l = v.left != null ? `${v.left}${typeof v.left === 'number' ? unit : ''}` : '0';
    return `${t} ${r} ${b} ${l}`;
}

export function isFlowLayout(templateData) {
    return templateData && templateData.layoutVersion === 2 && templateData.root && Array.isArray(templateData.root.children);
}

export function isLegacyLayout(templateData) {
    if (!templateData) return false;
    if (templateData.layoutVersion === 2 && templateData.root) return false;
    return Array.isArray(templateData.elements) && templateData.elements.length > 0 &&
        templateData.elements.some(el => typeof el.x === 'number' || typeof el.y === 'number');
}

function sortElementsByPosition(elements) {
    return [...elements].sort((a, b) => {
        const yA = a.y ?? 0;
        const yB = b.y ?? 0;
        if (yA !== yB) return yA - yB;
        return (a.x ?? 0) - (b.x ?? 0);
    });
}

export function migrateAbsoluteToRelative(templateData) {
    if (!templateData || !Array.isArray(templateData.elements) || templateData.elements.length === 0) {
        return templateData;
    }
    if (templateData.layoutVersion === 2 && templateData.root) {
        return templateData;
    }
    const sorted = sortElementsByPosition(templateData.elements);
    const children = sorted.map((el, i) => {
        const prev = sorted[i - 1];
        let marginTop = el.y ?? 0;
        let marginLeft = el.x ?? 0;
        if (prev) {
            const prevBottom = (prev.y ?? 0) + (prev.height ?? 30);
            if (el.y != null && prevBottom <= el.y) {
                marginTop = el.y - prevBottom;
            }
        }
        return {
            ...el,
            margin: { top: marginTop, left: marginLeft, right: 0, bottom: 0 },
            padding: el.padding ?? 5,
            width: el.width,
            height: el.height,
            x: undefined,
            y: undefined
        };
    });
    const root = {
        id: 'root',
        type: 'section',
        margin: 0,
        padding: 0,
        gap: 0,
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        children
    };
    return {
        ...templateData,
        layoutVersion: 2,
        root,
        elements: undefined
    };
}

export function getFlowTemplateData(templateData) {
    if (!templateData) return null;
    if (isFlowLayout(templateData)) return templateData;
    if (isLegacyLayout(templateData) || (templateData.elements && templateData.elements.length > 0)) {
        return migrateAbsoluteToRelative(templateData);
    }
    const children = Array.isArray(templateData.elements) ? templateData.elements : [];
    return {
        ...templateData,
        layoutVersion: 2,
        root: {
            id: 'root',
            type: 'section',
            margin: 0,
            padding: 0,
            gap: 8,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            children
        }
    };
}

let idCounter = () => Date.now() + Math.random();

/**
 * Normalize margin to plain object { top, right, bottom, left } (numbers only) for JSON.
 */
function marginToObject(m) {
    if (m == null) return { top: 0, right: 0, bottom: 0, left: 0 };
    if (typeof m === 'number') return { top: m, right: m, bottom: m, left: m };
    return {
        top: typeof m.top === 'number' ? m.top : 0,
        right: typeof m.right === 'number' ? m.right : 0,
        bottom: typeof m.bottom === 'number' ? m.bottom : 0,
        left: typeof m.left === 'number' ? m.left : 0
    };
}

/**
 * Serialize one content element for backend: no undefined, consistent types.
 */
function toExactNumber(v, fallback) {
    if (v == null) return fallback;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
        const n = parseFloat(v.replace(/\s*px$/i, '').trim(), 10);
        if (!Number.isNaN(n)) return n;
    }
    return v;
}

function isNumericOrPx(v) {
    if (v == null) return false;
    if (typeof v === 'number' && !Number.isNaN(v)) return true;
    return typeof v === 'string' && /^\d+(\.\d+)?(\s*px?)?$/i.test(v.trim());
}

/** Default width/height (px) per type when element has "auto" or no value. */
const DEFAULT_SIZE_BY_TYPE = {
    label: { width: 200, height: 24 },
    value: { width: 200, height: 24 },
    table: { width: null, height: 200 },
    image: { width: 100, height: 100 },
    shape: { width: 80, height: 80 }
};

/** 1mm in px at 96dpi (for converting page mm to px). */
const MM_TO_PX = 3.7795275591;

/**
 * Build tr and td CSS objects for a table element (for save/API). Use when element has no tr/td yet.
 * @param {Object} el - table element with margin, padding, fontSize, color, borderWidth, etc.
 * @returns {{ tr: Object, td: Object }}
 */
export function getTableTrTdCss(el) {
    const borderW = typeof el.borderWidth === 'number' ? el.borderWidth : 0;
    const cellBorderW = borderW || 1;
    const cellPad = 4;
    const bodyRowH = 25;
    const color = el.color != null ? String(el.color) : '#000000';
    const borderColor = el.borderColor != null ? String(el.borderColor) : '#000000';
    const borderStyle = el.borderStyle != null ? String(el.borderStyle) : 'solid';
    const fontSize = typeof el.fontSize === 'number' ? el.fontSize : 14;
    const fontFamily = el.fontFamily != null ? String(el.fontFamily) : 'Arial, sans-serif';
    const textAlign = el.textAlign != null ? String(el.textAlign) : 'left';
    const whiteSpace = el.whiteSpace != null ? String(el.whiteSpace) : 'normal';
    return {
        tr: {
            height: bodyRowH,
            borderWidth: cellBorderW,
            borderColor,
            borderStyle
        },
        td: {
            borderWidth: cellBorderW,
            borderColor,
            borderStyle,
            padding: cellPad,
            color,
            fontSize,
            fontFamily,
            textAlign,
            height: bodyRowH,
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            overflow: 'hidden',
            whiteSpace
        }
    };
}

function serializeElement(el, pageWidthPx, pageHeightPx) {
    const margin = marginToObject(el.margin);
    const type = el.type || 'label';
    const defaults = DEFAULT_SIZE_BY_TYPE[type] || DEFAULT_SIZE_BY_TYPE.label;

    let widthRaw = el.width != null ? el.width : 'auto';
    let heightRaw = el.height != null ? el.height : undefined;

    let widthPx;
    if (isNumericOrPx(widthRaw)) {
        widthPx = toExactNumber(widthRaw, defaults.width);
    } else if (widthRaw === '100%' && pageWidthPx != null) {
        widthPx = Math.round(pageWidthPx);
    } else {
        widthPx = typeof defaults.width === 'number' ? defaults.width : (pageWidthPx != null ? Math.round(pageWidthPx) : 200);
    }

    let heightPx;
    if (heightRaw != null && isNumericOrPx(heightRaw)) {
        heightPx = toExactNumber(heightRaw, defaults.height);
    } else if (heightRaw === '100%' && pageHeightPx != null) {
        heightPx = Math.round(pageHeightPx);
    } else {
        heightPx = typeof defaults.height === 'number' ? defaults.height : (pageHeightPx != null ? Math.round(pageHeightPx) : 24);
    }

    const paddingVal = typeof el.padding === 'number' ? el.padding : (el.padding != null ? el.padding : 5);
    const fontSizeVal = typeof el.fontSize === 'number' ? el.fontSize : 14;
    const borderWidthVal = typeof el.borderWidth === 'number' ? el.borderWidth : 0;
    const borderRadiusVal = typeof el.borderRadius === 'number' ? el.borderRadius : 0;

    const styles = {
        marginTop: margin.top,
        marginRight: margin.right,
        marginBottom: margin.bottom,
        marginLeft: margin.left,
        paddingTop: paddingVal,
        paddingRight: paddingVal,
        paddingBottom: paddingVal,
        paddingLeft: paddingVal,
        width: widthPx,
        height: heightPx,
        fontSize: fontSizeVal,
        color: el.color != null ? String(el.color) : '#000000',
        backgroundColor: el.backgroundColor != null ? String(el.backgroundColor) : 'transparent',
        fontWeight: el.fontWeight != null ? String(el.fontWeight) : 'normal',
        fontStyle: el.fontStyle != null ? String(el.fontStyle) : 'normal',
        textDecoration: el.textDecoration != null ? String(el.textDecoration) : 'none',
        fontFamily: el.fontFamily != null ? String(el.fontFamily) : 'Arial, sans-serif',
        textAlign: el.textAlign != null ? String(el.textAlign) : 'left',
        borderWidth: borderWidthVal,
        borderColor: el.borderColor != null ? String(el.borderColor) : '#000000',
        borderStyle: el.borderStyle != null ? String(el.borderStyle) : 'solid',
        borderRadius: borderRadiusVal,
        boxSizing: 'border-box',
        overflow: 'hidden',
        lineHeight: typeof el.lineHeight === 'number' ? el.lineHeight : (el.lineHeight != null ? String(el.lineHeight) : 'normal'),
        letterSpacing: typeof el.letterSpacing === 'number' ? el.letterSpacing : (el.letterSpacing != null ? String(el.letterSpacing) : 'normal'),
        verticalAlign: el.verticalAlign != null ? String(el.verticalAlign) : 'baseline',
        alignSelf: el.alignSelf != null ? String(el.alignSelf) : 'auto',
        minWidth: el.minWidth != null ? (typeof el.minWidth === 'number' ? el.minWidth : String(el.minWidth)) : 'auto',
        maxWidth: el.maxWidth != null ? (typeof el.maxWidth === 'number' ? el.maxWidth : String(el.maxWidth)) : 'none',
        minHeight: el.minHeight != null ? (typeof el.minHeight === 'number' ? el.minHeight : String(el.minHeight)) : 'auto',
        maxHeight: el.maxHeight != null ? (typeof el.maxHeight === 'number' ? el.maxHeight : String(el.maxHeight)) : 'none',
        wordWrap: 'break-word',
        wordBreak: 'break-word',
        whiteSpace: el.whiteSpace != null ? String(el.whiteSpace) : 'normal'
    };

    const out = {
        id: el.id,
        type: el.type,
        margin,
        padding: paddingVal,
        width: widthPx,
        height: heightPx,
        dataPath: el.dataPath != null ? String(el.dataPath) : '',
        text: el.text != null ? String(el.text) : '',
        fontSize: fontSizeVal,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        fontWeight: styles.fontWeight,
        fontStyle: styles.fontStyle,
        textDecoration: styles.textDecoration,
        fontFamily: styles.fontFamily,
        textAlign: styles.textAlign,
        borderWidth: styles.borderWidth,
        borderColor: styles.borderColor,
        borderStyle: styles.borderStyle,
        borderRadius: styles.borderRadius,
        selectedColumns: Array.isArray(el.selectedColumns) ? el.selectedColumns : [],
        columnHeaders: el.columnHeaders && typeof el.columnHeaders === 'object' ? el.columnHeaders : {},
        styles
    };
    if (el.type === 'image' && el.imageUrl != null) out.imageUrl = String(el.imageUrl);
    if (el.type === 'shape') {
        out.shapeKind = (el.shapeKind && ['rect', 'circle', 'ellipse', 'line'].includes(el.shapeKind)) ? el.shapeKind : 'rect';
    }

    if (el.type === 'table') {
        const cols = Array.isArray(el.selectedColumns) ? el.selectedColumns : [];
        const headers = el.columnHeaders && typeof el.columnHeaders === 'object' ? el.columnHeaders : {};
        out.columns = cols.map(key => ({ key: String(key), label: headers[key] != null ? String(headers[key]) : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }));
        out.numCols = cols.length;
        const cellBorderW = borderWidthVal || 1;
        const cellPad = 4;
        const headerH = 32;
        const bodyRowH = 25;
        out.tableCss = {
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            widthPx,
            heightPx,
            borderWidth: cellBorderW,
            borderColor: styles.borderColor,
            borderStyle: styles.borderStyle,
            borderRadius: borderRadiusVal,
            fontSize: fontSizeVal,
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontFamily: styles.fontFamily,
            fontWeight: styles.fontWeight,
            fontStyle: styles.fontStyle,
            textDecoration: styles.textDecoration,
            textAlign: styles.textAlign,
            boxSizing: 'border-box',
            overflow: 'hidden',
            lineHeight: styles.lineHeight,
            letterSpacing: styles.letterSpacing,
            wordWrap: styles.wordWrap,
            wordBreak: styles.wordBreak,
            whiteSpace: styles.whiteSpace,
            cellPaddingPx: cellPad,
            cellBorderWidth: cellBorderW,
            cellBorderColor: styles.borderColor,
            cellBorderStyle: styles.borderStyle,
            headerBackgroundColor: styles.backgroundColor,
            headerColor: styles.color,
            headerFontSize: fontSizeVal,
            headerFontWeight: 'bold',
            headerFontFamily: styles.fontFamily,
            headerTextAlign: 'left',
            headerRowHeightPx: headerH,
            headerPaddingPx: cellPad,
            rowHeightPx: bodyRowH,
            rowPaddingPx: cellPad,
            rowColor: styles.color,
            rowFontSize: fontSizeVal,
            rowFontFamily: styles.fontFamily,
            rowTextAlign: styles.textAlign,
            th: {
                borderWidth: cellBorderW,
                borderColor: styles.borderColor,
                borderStyle: styles.borderStyle,
                borderRadius: 0,
                padding: cellPad,
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                fontSize: fontSizeVal,
                fontWeight: 'bold',
                fontFamily: styles.fontFamily,
                textAlign: 'left',
                height: headerH,
                boxSizing: 'border-box',
                wordWrap: 'break-word',
                overflow: 'hidden'
            },
            tr: {
                height: bodyRowH,
                borderWidth: cellBorderW,
                borderColor: styles.borderColor,
                borderStyle: styles.borderStyle
            },
            td: {
                borderWidth: cellBorderW,
                borderColor: styles.borderColor,
                borderStyle: styles.borderStyle,
                borderRadius: 0,
                padding: cellPad,
                color: styles.color,
                fontSize: fontSizeVal,
                fontFamily: styles.fontFamily,
                textAlign: styles.textAlign,
                height: bodyRowH,
                boxSizing: 'border-box',
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                overflow: 'hidden',
                whiteSpace: styles.whiteSpace
            }
        };
        const thDefaults = {
            borderWidth: cellBorderW,
            borderColor: styles.borderColor,
            borderStyle: styles.borderStyle,
            borderRadius: 0,
            padding: cellPad,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            fontSize: fontSizeVal,
            fontWeight: 'bold',
            fontFamily: styles.fontFamily,
            textAlign: 'left',
            height: headerH,
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflow: 'hidden'
        };
        const thMerged = { ...thDefaults, ...(el.thCss || {}) };
        out.th = thMerged;
        out.tableCss.th = thMerged;
        const trDefaults = {
            height: bodyRowH,
            borderWidth: cellBorderW,
            borderColor: styles.borderColor,
            borderStyle: styles.borderStyle
        };
        const trMerged = { ...trDefaults, ...(el.trCss || {}) };
        out.tr = trMerged;
        out.tableCss.tr = trMerged;
        const tdDefaults = {
            borderWidth: cellBorderW,
            borderColor: styles.borderColor,
            borderStyle: styles.borderStyle,
            borderRadius: 0,
            padding: cellPad,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            fontSize: fontSizeVal,
            fontFamily: styles.fontFamily,
            textAlign: styles.textAlign,
            height: bodyRowH,
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            overflow: 'hidden',
            whiteSpace: styles.whiteSpace
        };
        const tdMerged = { ...tdDefaults, ...(el.tdCss || {}) };
        out.td = tdMerged;
        out.tableCss.td = tdMerged;
        
        // Add top header row if enabled
        if (el.topHeaderRow && el.topHeaderRow.enabled) {
            out.topHeaderRow = {
                enabled: true,
                text: el.topHeaderRow.text || 'CONSOLIDATED MARKS',
                backgroundColor: el.topHeaderRow.backgroundColor || '#1e3a8a',
                color: el.topHeaderRow.color || '#ffffff',
                fontSize: el.topHeaderRow.fontSize || 16,
                fontWeight: el.topHeaderRow.fontWeight || 'bold',
                borderRadius: el.topHeaderRow.borderRadius || 8
            };
        }
        
        // Add per-column styles
        if (el.columnStyles && typeof el.columnStyles === 'object') {
            out.columnStyles = el.columnStyles;
        }
        
        const colCount = cols.length;
        if (colCount > 0) {
            const perCol = Math.floor(widthPx / colCount);
            const widths = Array(colCount).fill(perCol);
            const remainder = widthPx - perCol * colCount;
            if (remainder > 0) widths[0] = widths[0] + remainder;
            out.columnWidthsPx = widths;
        } else {
            out.columnWidthsPx = [];
        }
    }

    // Handle row type: serialize children recursively
    if (el.type === 'row' && Array.isArray(el.children) && el.children.length > 0) {
        out.flexDirection = el.flexDirection || 'row';
        out.gap = typeof el.gap === 'number' ? el.gap : (el.gap || 8);
        out.alignItems = el.alignItems || 'stretch';
        out.justifyContent = el.justifyContent || 'flex-start';
        out.children = el.children.map(child => serializeElement(child, pageWidthPx, pageHeightPx));
    }

    return out;
}

/**
 * Serialize template_data for backend: parseable JSON, no undefined, consistent types.
 * Backend can JSON.parse(JSON.stringify(payload)) and use template_data to generate HTML.
 *
 * @param {Object} templateData - from getFlowTemplateData(raw)
 * @returns {Object} - plain object safe for JSON; root.children are serialized elements
 */
export function serializeTemplateDataForBackend(templateData) {
    const flow = getFlowTemplateData(templateData);
    if (!flow || !flow.root) {
        const pageMm = PAGE_SIZES_MM.A4;
        return {
            layoutVersion: 2,
            pageSize: 'A4',
            pageBg: '#ffffff',
            pageWidthMm: pageMm.width,
            pageHeightMm: pageMm.height,
            root: {
                id: 'root',
                type: 'section',
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                padding: 0,
                gap: 8,
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                children: []
            }
        };
    }
    const root = flow.root;
    const pageSizeKey = flow.pageSize != null ? String(flow.pageSize) : 'A4';
    const pageMm = PAGE_SIZES_MM[pageSizeKey] || PAGE_SIZES_MM.A4;
    const pageWidthPx = Math.round(pageMm.width * MM_TO_PX);
    const pageHeightPx = Math.round(pageMm.height * MM_TO_PX);
    const rootPadding = typeof root.padding === 'number' ? root.padding : 0;
    const contentWidthPx = Math.max(0, pageWidthPx - 2 * rootPadding);
    const contentHeightPx = Math.max(0, pageHeightPx - 2 * rootPadding);
    const children = Array.isArray(root.children)
        ? root.children.map(el => serializeElement(el, contentWidthPx, contentHeightPx))
        : [];
    return {
        layoutVersion: 2,
        pageSize: pageSizeKey,
        pageBg: flow.pageBg != null ? String(flow.pageBg) : '#ffffff',
        pageBackgroundImage: flow.pageBackgroundImage != null ? String(flow.pageBackgroundImage).trim() : undefined,
        pageWidthMm: pageMm.width,
        pageHeightMm: pageMm.height,
        root: {
            id: root.id || 'root',
            type: root.type || 'section',
            margin: marginToObject(root.margin),
            padding: typeof root.padding === 'number' ? root.padding : 0,
            gap: typeof root.gap === 'number' ? root.gap : 8,
            flexDirection: root.flexDirection || 'column',
            alignItems: root.alignItems || 'stretch',
            justifyContent: root.justifyContent || 'flex-start',
            children
        }
    };
}

export function createContentElement(type) {
    const base = {
        id: `el_${idCounter()}`,
        type,
        margin: 0,
        padding: type === 'table' ? 0 : 5,
        width: type === 'table' ? '100%' : type === 'image' ? 100 : 'auto',
        height: type === 'table' ? 200 : type === 'image' ? 100 : undefined,
        dataPath: '',
        text: type === 'label' ? 'New Label' : '',
        fontSize: 14,
        color: '#000000',
        backgroundColor: type === 'table' ? '#f0f0f0' : 'transparent',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'left',
        borderWidth: 0,
        borderColor: '#000000',
        borderStyle: 'solid',
        borderRadius: 0,
        selectedColumns: [],
        columnHeaders: {}
    };
    if (type === 'image') {
        base.height = 100;
        base.imageUrl = '';
    }
    if (type === 'table') base.height = 200;
    if (type === 'shape') {
        base.width = 80;
        base.height = 80;
        base.shapeKind = 'rect';
        base.borderWidth = 1;
    }
    return base;
}
