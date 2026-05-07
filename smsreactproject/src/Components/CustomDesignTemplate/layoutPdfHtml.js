/**
 * Generate print-safe HTML for backend PDF. Same flow layout as LayoutRenderer.
 */
import { getFlowTemplateData } from './layoutSchema';

const PAGE_SIZES_MM = { A4: { width: 210, height: 297 }, A5: { width: 148, height: 210 }, A3: { width: 297, height: 420 } };

function getValue(data, path) {
    if (!data || !path) return '';
    const keys = path.split('.');
    let value = data;
    for (const key of keys) {
        if (value && typeof value === 'object') {
            value = /^\d+$/.test(key) ? (Array.isArray(value) ? value[parseInt(key, 10)] : undefined) : value[key];
        } else return '';
    }
    return value;
}

function escapeHtml(str) {
    if (str == null) return '';
    const s = String(str);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeDjangoTemplate(str) {
    if (str == null) return '';
    // Escape Django template syntax so it appears as literal text
    // {{variable}} becomes visible text {{variable}} in HTML
    return String(str).replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;');
}

function cssLength(v, unit = 'px') {
    if (v == null) return '0';
    if (typeof v === 'string') return v;
    return `${v}${unit}`;
}

function boxToCss(v, unit = 'px') {
    if (v == null) return '0';
    if (typeof v === 'number') return `${v}${unit}`;
    if (typeof v === 'string') return v;
    const t = v.top != null ? cssLength(v.top, unit) : '0';
    const r = v.right != null ? cssLength(v.right, unit) : '0';
    const b = v.bottom != null ? cssLength(v.bottom, unit) : '0';
    const l = v.left != null ? cssLength(v.left, unit) : '0';
    return `${t} ${r} ${b} ${l}`;
}

function containerToStyle(node) {
    const margin = boxToCss(node.margin);
    const padding = boxToCss(node.padding);
    const flexDirection = node.flexDirection || (node.type === 'row' ? 'row' : 'column');
    const gap = typeof node.gap === 'number' ? `${node.gap}px` : (node.gap || '0');
    const width = node.width != null ? (typeof node.width === 'number' ? `${node.width}px` : node.width) : '100%';
    return ['display:flex', `flex-direction:${flexDirection}`, `flex-wrap:${node.flexWrap || 'nowrap'}`, `align-items:${node.alignItems || 'flex-start'}`, `justify-content:${node.justifyContent || 'flex-start'}`, `gap:${gap}`, `margin:${margin}`, `padding:${padding}`, `width:${width}`, 'box-sizing:border-box'].join(';');
}

function contentWrapperStyle(el) {
    const s = el.styles;
    if (s && typeof s === 'object') {
        const margin = `${s.marginTop ?? 0}px ${s.marginRight ?? 0}px ${s.marginBottom ?? 0}px ${s.marginLeft ?? 0}px`;
        const padding = `${s.paddingTop ?? 0}px ${s.paddingRight ?? 0}px ${s.paddingBottom ?? 0}px ${s.paddingLeft ?? 0}px`;
        const w = s.width ?? el.width;
        const widthCss = typeof w === 'number' ? `${w}px` : (w || 'auto');
        const parts = [`margin:${margin}`, `padding:${padding}`, `width:${widthCss}`, 'box-sizing:border-box', `overflow:${s.overflow ?? 'hidden'}`];
        if (s.height != null) parts.push(`height:${s.height}px`);
        if (s.borderWidth != null) parts.push(`border:${s.borderWidth}px ${s.borderStyle ?? 'solid'} ${s.borderColor ?? '#000'}`);
        if (s.borderRadius != null) parts.push(`border-radius:${s.borderRadius}px`);
        if (s.backgroundColor != null) parts.push(`background-color:${s.backgroundColor}`);
        if (s.alignSelf != null && s.alignSelf !== 'auto') parts.push(`align-self:${s.alignSelf}`);
        return parts.join(';');
    }
    const margin = boxToCss(el.margin);
    const padding = boxToCss(el.padding);
    const width = el.width != null ? (typeof el.width === 'number' ? `${el.width}px` : el.width) : 'auto';
    const height = el.height != null ? (typeof el.height === 'number' ? `${el.height}px` : el.height) : 'auto';
    const parts = [`margin:${margin}`, `padding:${padding}`, `width:${width}`, 'box-sizing:border-box', 'overflow:hidden'];
    if (height !== 'auto') parts.push(`height:${height}`);
    if (el.flex) parts.push(`flex:${el.flex}`);
    if (el.alignSelf) parts.push(`align-self:${el.alignSelf}`);
    return parts.join(';');
}

function contentInnerStyle(el, isTable = false) {
    const s = el.styles;
    if (s && typeof s === 'object' && !isTable) {
        const padding = s.paddingTop ?? s.padding ?? 5;
        const border = `${s.borderWidth ?? 0}px ${s.borderStyle ?? 'solid'} ${s.borderColor ?? '#000000'}`;
        const parts = ['width:100%', 'height:100%', `font-size:${s.fontSize ?? 14}px`, `color:${s.color ?? '#000000'}`, `font-weight:${s.fontWeight ?? 'normal'}`, `font-style:${s.fontStyle ?? 'normal'}`, `text-decoration:${s.textDecoration ?? 'none'}`, `font-family:${s.fontFamily ?? 'Arial,sans-serif'}`, `text-align:${s.textAlign ?? 'left'}`, 'display:flex', 'align-items:center', `padding:${padding}px`, `border:${border}`, `border-radius:${s.borderRadius ?? 0}px`, `background-color:${s.backgroundColor ?? 'transparent'}`, 'box-sizing:border-box', `overflow:${s.overflow ?? 'hidden'}`, `line-height:${s.lineHeight ?? 'normal'}`, `word-wrap:${s.wordWrap ?? 'break-word'}`, `word-break:${s.wordBreak ?? 'break-word'}`];
        return parts.join(';');
    }
    const padding = typeof el.padding === 'number' ? el.padding : 5;
    const border = `${el.borderWidth || 0}px ${el.borderStyle || 'solid'} ${el.borderColor || '#000000'}`;
    if (isTable) return ['width:100%', 'height:100%', `font-size:${el.fontSize || 10}px`, 'border-collapse:collapse', 'table-layout:fixed'].join(';');
    return ['width:100%', 'height:100%', `font-size:${el.fontSize || 14}px`, `color:${el.color || '#000000'}`, `font-weight:${el.fontWeight || 'normal'}`, `font-style:${el.fontStyle || 'normal'}`, `text-decoration:${el.textDecoration || 'none'}`, `font-family:${el.fontFamily || 'Arial,sans-serif'}`, `text-align:${el.textAlign || 'left'}`, 'display:flex', 'align-items:center', `padding:${padding}px`, `border:${border}`, `border-radius:${el.borderRadius || 0}px`, `background-color:${el.backgroundColor || 'transparent'}`, 'box-sizing:border-box'].join(';');
}

function dataPathToDjango(path) {
    if (!path || typeof path !== 'string') return '';
    // Convert data path to Django template syntax
    // e.g., "institute.name" -> "{{institute.name}}"
    // e.g., "data.student_list.0.name" -> "{{data.student_list.0.name}}"
    const trimmed = path.trim();
    return `{{${trimmed}}}`;
}

function renderContentHtml(el, data, djangoMode = false) {
    const innerStyle = contentInnerStyle(el);
    switch (el.type) {
        case 'label':
            return `<div style="${innerStyle}">${escapeHtml(el.text || 'Label')}</div>`;
        case 'value': {
            if (djangoMode) {
                // Always show Django mapping as text if dataPath exists, even with no data
                if (el.dataPath) {
                    const djangoVar = `{{${el.dataPath.trim()}}}`;
                    return `<div style="${innerStyle};word-break:break-word">${escapeDjangoTemplate(djangoVar)}</div>`;
                }
                // If no dataPath, show empty or placeholder
                return `<div style="${innerStyle};word-break:break-word"></div>`;
            }
            const raw = el.dataPath ? getValue(data, el.dataPath) : '';
            const value = typeof raw === 'string' ? raw : (raw != null ? String(raw) : '');
            return `<div style="${innerStyle};word-break:break-word">${escapeHtml(value || 'No data')}</div>`;
        }
        case 'image': {
            if (djangoMode) {
                if (el.imageUrl) {
                    return `<img src="${escapeHtml(el.imageUrl)}" alt="" style="width:100%;height:100%;object-fit:contain;display:block" />`;
                } else if (el.dataPath) {
                    // Always show Django mapping as text if dataPath exists, even with no data
                    const djangoVar = `{{${el.dataPath.trim()}}}`;
                    return `<img src="${escapeDjangoTemplate(djangoVar)}" alt="" style="width:100%;height:100%;object-fit:contain;display:block" />`;
                }
                // If no dataPath and no imageUrl, show placeholder
                return `<img src="https://via.placeholder.com/100" alt="" style="width:100%;height:100%;object-fit:contain;display:block" />`;
            }
            const imageFromData = el.dataPath ? (getValue(data, el.dataPath) || '') : '';
            const imageSrc = el.imageUrl || imageFromData || '';
            const src = imageSrc || 'https://via.placeholder.com/100';
            return `<img src="${escapeHtml(src)}" alt="" style="width:100%;height:100%;object-fit:contain;display:${imageSrc ? 'block' : 'none'}" />`;
        }
        case 'table': {
            if (djangoMode && el.dataPath) {
                // Django template mode: always show mapping keys as text, even with no data
                const css = el.tableCss || {};
                const objToStyle = (obj) => {
                    if (!obj || typeof obj !== 'object') return '';
                    const needPx = (k) => ['padding', 'borderWidth', 'borderRadius', 'height', 'fontSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].includes(k);
                    const parts = [];
                    Object.keys(obj).forEach(k => {
                        const v = obj[k];
                        if (v == null) return;
                        const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^\-/, '');
                        const val = typeof v === 'number' && needPx(k) ? `${v}px` : String(v);
                        parts.push(`${prop}:${val}`);
                    });
                    return parts.join(';');
                };
                const thCss = el.th != null && typeof el.th === 'object' ? el.th : (css.th || {});
                const trCss = el.tr != null && typeof el.tr === 'object' ? el.tr : (css.tr || {});
                const tdCss = el.td != null && typeof el.td === 'object' ? el.td : (css.td || {});
                const cellBorder = `${tdCss.borderWidth ?? css.cellBorderWidth ?? 1}px ${tdCss.borderStyle ?? css.cellBorderStyle ?? 'solid'} ${tdCss.borderColor ?? css.cellBorderColor ?? '#ccc'}`;
                const thStyle = objToStyle(thCss) || `border:${cellBorder};padding:${thCss.padding ?? css.headerPaddingPx ?? 4}px;background-color:${thCss.backgroundColor ?? css.headerBackgroundColor ?? '#f0f0f0'};color:${thCss.color ?? css.headerColor ?? '#000'};font-weight:${thCss.fontWeight ?? 'bold'};font-family:${thCss.fontFamily ?? 'Arial,sans-serif'};text-align:${thCss.textAlign ?? 'left'};font-size:${thCss.fontSize ?? css.fontSize ?? 10}px;height:${thCss.height ?? css.headerRowHeightPx ?? 32}px;box-sizing:border-box;word-wrap:break-word;overflow:hidden`;
                const trStyle = objToStyle(trCss) || '';
                const tdStyle = objToStyle(tdCss) || `border:${cellBorder};padding:${tdCss.padding ?? css.rowPaddingPx ?? 4}px;color:${tdCss.color ?? css.rowColor ?? '#000'};font-family:${tdCss.fontFamily ?? 'Arial,sans-serif'};text-align:${tdCss.textAlign ?? 'left'};font-size:${tdCss.fontSize ?? css.fontSize ?? 10}px;height:${tdCss.height ?? css.rowHeightPx ?? 25}px;box-sizing:border-box;word-wrap:break-word;overflow:hidden;text-overflow:ellipsis`;
                // Always use columns from element config, even if no data
                const cols = Array.isArray(el.columns) && el.columns.length > 0
                    ? el.columns
                    : (el.selectedColumns && el.selectedColumns.length > 0
                        ? el.selectedColumns.map(key => ({ key, label: (el.columnHeaders && el.columnHeaders[key]) || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
                        : []);
                const columnWidthsPx = Array.isArray(el.columnWidthsPx) && el.columnWidthsPx.length === cols.length ? el.columnWidthsPx : (cols.length > 0 ? Array(cols.length).fill(Math.floor((el.width || 400) / cols.length)) : []);
                const colgroup = columnWidthsPx.length > 0 ? `<colgroup>${columnWidthsPx.map(w => `<col style="width:${w}px" />`).join('')}</colgroup>` : '';
                const ths = cols.map((h, i) => {
                    const w = columnWidthsPx[i] != null ? `width:${columnWidthsPx[i]}px;` : '';
                    return `<th style="${w}${thStyle}">${escapeHtml(h.label)}</th>`;
                }).join('');
                // Use dataPath directly as Django template variable - always show mapping even with no data
                const djangoVar = el.dataPath.trim(); // e.g., "data.student_list.0.subject_list_data"
                const rowVar = 'row'; // Standard Django loop variable
                const tbodyRows = cols.map((h, i) => {
                    const w = columnWidthsPx[i] != null ? `width:${columnWidthsPx[i]}px;` : '';
                    const djangoCellVar = `{{${rowVar}.${h.key}}}`;
                    return `<td style="${w}${tdStyle}">${escapeDjangoTemplate(djangoCellVar)}</td>`;
                }).join('');
                let topHeaderRowHtml = '';
                if (el.topHeaderRow && el.topHeaderRow.enabled) {
                    const topHeaderStyle = `background-color:${el.topHeaderRow.backgroundColor || '#1e3a8a'};color:${el.topHeaderRow.color || '#ffffff'};font-size:${el.topHeaderRow.fontSize || 16}px;font-weight:${el.topHeaderRow.fontWeight || 'bold'};text-align:center;padding:${thCss.padding ?? css.headerPaddingPx ?? 8}px;border-top-left-radius:${el.topHeaderRow.borderRadius || 8}px;border-top-right-radius:${el.topHeaderRow.borderRadius || 8}px;border-bottom-left-radius:0;border-bottom-right-radius:0;border:${thCss.borderWidth ?? css.cellBorderWidth ?? 1}px ${thCss.borderStyle ?? css.cellBorderStyle ?? 'solid'} ${thCss.borderColor ?? css.cellBorderColor ?? '#000'};border-bottom:none;box-sizing:border-box`;
                    topHeaderRowHtml = `<thead><tr><th colspan="${cols.length}" style="${topHeaderStyle}">${escapeHtml(el.topHeaderRow.text || 'CONSOLIDATED MARKS')}</th></tr></thead>`;
                }
                const tableBorder = `${css.borderWidth ?? 1}px ${css.borderStyle ?? 'solid'} ${css.borderColor ?? '#000000'}`;
                const tableStyle = `width:100%;height:100%;font-size:${tdCss.fontSize ?? css.fontSize ?? 10}px;font-family:${tdCss.fontFamily ?? css.fontFamily ?? 'Arial,sans-serif'};color:${tdCss.color ?? css.color ?? '#000'};border-collapse:${css.borderCollapse ?? 'collapse'};table-layout:${css.tableLayout ?? 'fixed'};border:${tableBorder};box-sizing:border-box;overflow:hidden`;
                const djangoForLoop = `{%for ${rowVar} in ${djangoVar}%}`;
                const djangoEndFor = `{%endfor%}`;
                // Always show Django mapping keys, even if there's no data
                return `<table style="${tableStyle}">${colgroup}${topHeaderRowHtml}<thead><tr${trStyle ? ` style="${trStyle}"` : ''}>${ths}</tr></thead><tbody>${escapeDjangoTemplate(djangoForLoop)}<tr${trStyle ? ` style="${trStyle}"` : ''}>${tbodyRows}</tr>${escapeDjangoTemplate(djangoEndFor)}</tbody></table>`;
            }
            // Original JavaScript mode
            const rawTable = el.dataPath ? getValue(data, el.dataPath) : null;
            const arr = Array.isArray(rawTable) ? rawTable : [];
            const css = el.tableCss || {};
            const objToStyle = (obj) => {
                if (!obj || typeof obj !== 'object') return '';
                const needPx = (k) => ['padding', 'borderWidth', 'borderRadius', 'height', 'fontSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].includes(k);
                const parts = [];
                Object.keys(obj).forEach(k => {
                    const v = obj[k];
                    if (v == null) return;
                    const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^\-/, '');
                    const val = typeof v === 'number' && needPx(k) ? `${v}px` : String(v);
                    parts.push(`${prop}:${val}`);
                });
                return parts.join(';');
            };
            const thCss = el.th != null && typeof el.th === 'object' ? el.th : (css.th || {});
            const trCss = el.tr != null && typeof el.tr === 'object' ? el.tr : (css.tr || {});
            const tdCss = el.td != null && typeof el.td === 'object' ? el.td : (css.td || {});
            const cellBorder = `${tdCss.borderWidth ?? css.cellBorderWidth ?? 1}px ${tdCss.borderStyle ?? css.cellBorderStyle ?? 'solid'} ${tdCss.borderColor ?? css.cellBorderColor ?? '#ccc'}`;
            const thStyle = objToStyle(thCss) || `border:${cellBorder};padding:${thCss.padding ?? css.headerPaddingPx ?? 4}px;background-color:${thCss.backgroundColor ?? css.headerBackgroundColor ?? '#f0f0f0'};color:${thCss.color ?? css.headerColor ?? '#000'};font-weight:${thCss.fontWeight ?? 'bold'};font-family:${thCss.fontFamily ?? 'Arial,sans-serif'};text-align:${thCss.textAlign ?? 'left'};font-size:${thCss.fontSize ?? css.fontSize ?? 10}px;height:${thCss.height ?? css.headerRowHeightPx ?? 32}px;box-sizing:border-box;word-wrap:break-word;overflow:hidden`;
            const trStyle = objToStyle(trCss) || '';
            const tdStyle = objToStyle(tdCss) || `border:${cellBorder};padding:${tdCss.padding ?? css.rowPaddingPx ?? 4}px;color:${tdCss.color ?? css.rowColor ?? '#000'};font-family:${tdCss.fontFamily ?? 'Arial,sans-serif'};text-align:${tdCss.textAlign ?? 'left'};font-size:${tdCss.fontSize ?? css.fontSize ?? 10}px;height:${tdCss.height ?? css.rowHeightPx ?? 25}px;box-sizing:border-box;word-wrap:break-word;overflow:hidden;text-overflow:ellipsis`;
            const headerHeight = thCss.height ?? css.headerRowHeightPx ?? 32;
            const rowHeight = tdCss.height ?? css.rowHeightPx ?? 25;
            const cols = Array.isArray(el.columns) && el.columns.length > 0
                ? el.columns
                : (el.selectedColumns && el.selectedColumns.length > 0
                    ? el.selectedColumns.map(key => ({ key, label: (el.columnHeaders && el.columnHeaders[key]) || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
                    : (arr.length > 0 ? Object.keys(arr[0]).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) })) : []));
            const allKeys = arr.length > 0 ? Object.keys(arr[0]) : [];
            const headers = cols.filter(c => allKeys.includes(c.key)).length > 0 ? cols.filter(c => allKeys.includes(c.key)) : cols;
            const columnWidthsPx = Array.isArray(el.columnWidthsPx) && el.columnWidthsPx.length === headers.length ? el.columnWidthsPx : (headers.length > 0 ? Array(headers.length).fill(Math.floor((el.width || 400) / headers.length)) : []);
            const rowLimit = el.height && rowHeight > 0 ? Math.max(1, Math.floor((el.height - headerHeight) / rowHeight)) : 20;
            if (arr.length === 0) return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:12px">No data</div>`;
            
            // Top header row
            let topHeaderRowHtml = '';
            if (el.topHeaderRow && el.topHeaderRow.enabled) {
                const topHeaderStyle = `background-color:${el.topHeaderRow.backgroundColor || '#1e3a8a'};color:${el.topHeaderRow.color || '#ffffff'};font-size:${el.topHeaderRow.fontSize || 16}px;font-weight:${el.topHeaderRow.fontWeight || 'bold'};text-align:center;padding:${thCss.padding ?? css.headerPaddingPx ?? 8}px;border-top-left-radius:${el.topHeaderRow.borderRadius || 8}px;border-top-right-radius:${el.topHeaderRow.borderRadius || 8}px;border-bottom-left-radius:0;border-bottom-right-radius:0;border:${thCss.borderWidth ?? css.cellBorderWidth ?? 1}px ${thCss.borderStyle ?? css.cellBorderStyle ?? 'solid'} ${thCss.borderColor ?? css.cellBorderColor ?? '#000'};border-bottom:none;box-sizing:border-box`;
                topHeaderRowHtml = `<thead><tr><th colspan="${headers.length}" style="${topHeaderStyle}">${escapeHtml(el.topHeaderRow.text || 'CONSOLIDATED MARKS')}</th></tr></thead>`;
            }
            
            // Per-column styling helper
            const getColumnStyle = (colKey, idx, isTh) => {
                const colStyles = el.columnStyles?.[colKey] || {};
                const isFirst = idx === 0;
                const isLast = idx === headers.length - 1;
                let borderRadius = '';
                if (isFirst) {
                    if (colStyles.borderRadiusTopLeft) borderRadius += `border-top-left-radius:${colStyles.borderRadiusTopLeft}px;`;
                    if (colStyles.borderRadiusBottomLeft) borderRadius += `border-bottom-left-radius:${colStyles.borderRadiusBottomLeft}px;`;
                }
                if (isLast) {
                    if (colStyles.borderRadiusTopRight) borderRadius += `border-top-right-radius:${colStyles.borderRadiusTopRight}px;`;
                    if (colStyles.borderRadiusBottomRight) borderRadius += `border-bottom-right-radius:${colStyles.borderRadiusBottomRight}px;`;
                }
                return {
                    backgroundColor: isTh 
                        ? (colStyles.thBackgroundColor || thCss.backgroundColor || css.headerBackgroundColor || '#f0f0f0')
                        : (colStyles.tdBackgroundColor || tdCss.backgroundColor || '#ffffff'),
                    textAlign: isTh 
                        ? (colStyles.thTextAlign || thCss.textAlign || 'center')
                        : (colStyles.tdTextAlign || (isFirst ? 'left' : 'center')),
                    borderRadius
                };
            };
            
            const colgroup = columnWidthsPx.length > 0 ? `<colgroup>${columnWidthsPx.map(w => `<col style="width:${w}px" />`).join('')}</colgroup>` : '';
            const ths = headers.map((h, i) => {
                const w = columnWidthsPx[i] != null ? `width:${columnWidthsPx[i]}px;` : '';
                const colStyle = getColumnStyle(h.key, i, true);
                const finalThStyle = `${w}${thStyle};background-color:${colStyle.backgroundColor};text-align:${colStyle.textAlign};${colStyle.borderRadius}`;
                return `<th style="${finalThStyle}">${escapeHtml(h.label)}</th>`;
            }).join('');
            const rows = arr.slice(0, rowLimit).map(row => `<tr${trStyle ? ` style="${trStyle}"` : ''}>${headers.map((h, i) => {
                const w = columnWidthsPx[i] != null ? `width:${columnWidthsPx[i]}px;` : '';
                const colStyle = getColumnStyle(h.key, i, false);
                const finalTdStyle = `${w}${tdStyle};background-color:${colStyle.backgroundColor};text-align:${colStyle.textAlign};${colStyle.borderRadius}`;
                return `<td style="${finalTdStyle}">${escapeHtml(String(row[h.key] ?? ''))}</td>`;
            }).join('')}</tr>`).join('');
            const tableBorder = `${css.borderWidth ?? 1}px ${css.borderStyle ?? 'solid'} ${css.borderColor ?? '#000000'}`;
            const tableStyle = `width:100%;height:100%;font-size:${tdCss.fontSize ?? css.fontSize ?? 10}px;font-family:${tdCss.fontFamily ?? css.fontFamily ?? 'Arial,sans-serif'};color:${tdCss.color ?? css.color ?? '#000'};border-collapse:${css.borderCollapse ?? 'collapse'};table-layout:${css.tableLayout ?? 'fixed'};border:${tableBorder};box-sizing:border-box;overflow:hidden`;
            return `<table style="${tableStyle}">${colgroup}${topHeaderRowHtml}<thead><tr${trStyle ? ` style="${trStyle}"` : ''}>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
        }
        case 'shape': {
            const kind = (el.shapeKind && ['rect', 'circle', 'ellipse', 'line'].includes(el.shapeKind)) ? el.shapeKind : 'rect';
            const fill = el.backgroundColor != null ? String(el.backgroundColor) : 'transparent';
            const stroke = el.borderColor != null ? String(el.borderColor) : '#000000';
            const strokeW = typeof el.borderWidth === 'number' ? el.borderWidth : 1;
            const rx = kind === 'rect' && typeof el.borderRadius === 'number' ? el.borderRadius : 0;
            const w = 100, h = 100;
            let svg = '';
            if (kind === 'rect') svg = `<rect x="${strokeW/2}" y="${strokeW/2}" width="${w-strokeW}" height="${h-strokeW}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" rx="${rx}"/>`;
            else if (kind === 'circle') svg = `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2 - strokeW/2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>`;
            else if (kind === 'ellipse') svg = `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2 - strokeW/2}" ry="${h/2 - strokeW/2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>`;
            else if (kind === 'line') svg = `<line x1="${strokeW}" y1="${strokeW}" x2="${w-strokeW}" y2="${h-strokeW}" stroke="${stroke}" stroke-width="${strokeW}"/>`;
            return `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">${svg}</svg>`;
        }
        default: return '';
    }
}

function nodeToHtml(node, data) {
    if (!node || !node.type) return '';
    const isContainer = node.type === 'section' || node.type === 'row' || node.type === 'column';
    if (isContainer && Array.isArray(node.children)) {
        const style = containerToStyle(node);
        const inner = node.children.map(child => nodeToHtml(child, data)).join('');
        return `<div style="${style}">${inner}</div>`;
    }
    const wrapStyle = contentWrapperStyle(node);
    const inner = renderContentHtml(node, data);
    return `<div style="${wrapStyle}">${inner}</div>`;
}

export function buildPdfHtml(templateData, data = null, options = {}) {
    const flow = getFlowTemplateData(templateData);
    if (!flow || !flow.root) return '<html><body><p>No template content</p></body></html>';
    const pageSize = flow.pageSize || 'A5';
    const pageBg = flow.pageBg || '#ffffff';
    const pageBgImage = flow.pageBackgroundImage && String(flow.pageBackgroundImage).trim();
    const size = PAGE_SIZES_MM[pageSize] || PAGE_SIZES_MM.A5;
    const title = options.title || 'Template';
    const lang = options.lang || 'en';
    const djangoMode = options.djangoMode === true;
    const bodyContent = nodeToHtml(flow.root, data, djangoMode);
    const pageStyle = `width:${size.width}mm;min-height:${size.height}mm;background-color:${pageBg};margin:0;padding:0;overflow:hidden;${pageBgImage ? `background-image:url(${escapeHtml(pageBgImage)});background-size:cover;background-position:center;` : ''}`;
    return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pdf-page { width: ${size.width}mm; min-height: ${size.height}mm; page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="pdf-page" style="${pageStyle}">
    ${bodyContent}
  </div>
</body>
</html>`;
}
