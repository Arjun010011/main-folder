/**
 * Flow layout renderer: margin-based, same as PDF output.
 */
import React from 'react';
import { getFlowTemplateData, boxSpacingToCss } from './layoutSchema';

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

function getContainerStyle(node) {
    const margin = boxSpacingToCss(node.margin);
    const padding = boxSpacingToCss(node.padding);
    const flexDirection = node.flexDirection || (node.type === 'row' ? 'row' : 'column');
    const gap = typeof node.gap === 'number' ? `${node.gap}px` : (node.gap || '0');
    const width = node.width != null ? (typeof node.width === 'number' ? `${node.width}px` : node.width) : '100%';
    return {
        display: 'flex', flexDirection, flexWrap: node.flexWrap || 'nowrap',
        alignItems: node.alignItems || 'flex-start', justifyContent: node.justifyContent || 'flex-start',
        gap, margin, padding, width, boxSizing: 'border-box'
    };
}

function getContentWrapperStyle(el) {
    const margin = boxSpacingToCss(el.margin);
    const padding = boxSpacingToCss(el.padding);
    const width = el.width != null ? (typeof el.width === 'number' ? `${el.width}px` : el.width) : 'auto';
    const height = el.height != null ? (typeof el.height === 'number' ? `${el.height}px` : el.height) : undefined;
    return { margin, padding, width, minWidth: width === 'auto' ? undefined : width, height, flex: el.flex, alignSelf: el.alignSelf, boxSizing: 'border-box', overflow: 'hidden' };
}

function renderContentElement(el, data) {
    const paddingPx = typeof el.padding === 'number' ? el.padding : 5;
    const border = `${el.borderWidth || 0}px ${el.borderStyle || 'solid'} ${el.borderColor || '#000000'}`;
    const baseBox = {
        width: '100%', height: '100%', fontSize: `${el.fontSize || 14}px`, color: el.color || '#000000',
        fontWeight: el.fontWeight || 'normal', fontStyle: el.fontStyle || 'normal', textDecoration: el.textDecoration || 'none',
        fontFamily: el.fontFamily || 'Arial, sans-serif', textAlign: el.textAlign || 'left',
        display: 'flex', alignItems: 'center', padding: `${paddingPx}px`, border, borderRadius: `${el.borderRadius || 0}px`,
        backgroundColor: el.backgroundColor || 'transparent', boxSizing: 'border-box'
    };
    switch (el.type) {
        case 'label':
            return <div style={baseBox}>{el.text || 'Label'}</div>;
        case 'value': {
            const raw = el.dataPath ? getValue(data, el.dataPath) : '';
            const value = typeof raw === 'string' ? raw : (raw != null ? String(raw) : '');
            return <div style={{ ...baseBox, wordBreak: 'break-word' }}>{value || 'No data'}</div>;
        }
        case 'image': {
            const imageSrc = el.imageUrl || (el.dataPath ? (getValue(data, el.dataPath) || '') : '');
            return <img src={imageSrc || 'https://via.placeholder.com/100'} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: imageSrc ? 'block' : 'none' }} onError={(e) => { e.target.style.display = 'none'; }} />;
        }
        case 'shape': {
            const kind = el.shapeKind || 'rect';
            const fill = el.backgroundColor || 'transparent';
            const stroke = el.borderColor || '#000000';
            const strokeW = el.borderWidth != null ? el.borderWidth : 1;
            const w = 100, h = 100;
            return (
                <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                    {kind === 'rect' && <rect x={strokeW/2} y={strokeW/2} width={w-strokeW} height={h-strokeW} fill={fill} stroke={stroke} strokeWidth={strokeW} rx={el.borderRadius || 0} />}
                    {kind === 'circle' && <circle cx={w/2} cy={h/2} r={Math.min(w,h)/2 - strokeW/2} fill={fill} stroke={stroke} strokeWidth={strokeW} />}
                    {kind === 'ellipse' && <ellipse cx={w/2} cy={h/2} rx={w/2 - strokeW/2} ry={h/2 - strokeW/2} fill={fill} stroke={stroke} strokeWidth={strokeW} />}
                    {kind === 'line' && <line x1={strokeW} y1={strokeW} x2={w-strokeW} y2={h-strokeW} stroke={stroke} strokeWidth={strokeW} />}
                </svg>
            );
        }
        case 'table': {
            const rawTable = el.dataPath ? getValue(data, el.dataPath) : null;
            const arr = Array.isArray(rawTable) ? rawTable : [];
            const allColumns = arr.length > 0 ? Object.keys(arr[0]) : [];
            const headers = el.selectedColumns && el.selectedColumns.length > 0 ? el.selectedColumns.filter(col => allColumns.includes(col)) : allColumns;
            const getHeaderLabel = (col) => el.columnHeaders?.[col] || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const rowLimit = el.height ? Math.max(1, Math.floor((el.height - 40) / 25)) : 20;
            if (arr.length === 0) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 12 }}>No data</div>;
            return (
                <table style={{ width: '100%', height: '100%', fontSize: el.fontSize || 10, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead><tr>{headers.map(h => <th key={h} style={{ border: '1px solid #ccc', padding: '4px', backgroundColor: el.backgroundColor || '#f0f0f0', fontWeight: 'bold', textAlign: 'left' }}>{getHeaderLabel(h)}</th>)}</tr></thead>
                    <tbody>{arr.slice(0, rowLimit).map((row, i) => <tr key={i}>{headers.map(h => <td key={h} style={{ border: '1px solid #ccc', padding: '4px', wordWrap: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(row[h] ?? '')}</td>)}</tr>)}</tbody>
                </table>
            );
        }
        default: return null;
    }
}

function renderNode(node, data, key) {
    if (!node || !node.type) return null;
    const k = key ?? node.id;
    const isContainer = node.type === 'section' || node.type === 'row' || node.type === 'column';
    if (isContainer && Array.isArray(node.children)) {
        return <div key={k} style={getContainerStyle(node)}>{node.children.map((child, i) => renderNode(child, data, child.id ? undefined : `${k}_${i}`))}</div>;
    }
    const wrapperStyle = getContentWrapperStyle(node);
    return <div key={k} style={wrapperStyle}>{renderContentElement(node, data)}</div>;
}

export default function LayoutRenderer({ templateData, data = null, options = {} }) {
    const flow = getFlowTemplateData(templateData);
    if (!flow || !flow.root) return null;
    const pageSize = flow.pageSize || options.pageSize || 'A5';
    const pageBg = flow.pageBg || options.pageBg || '#ffffff';
    const pageBgImage = flow.pageBackgroundImage && String(flow.pageBackgroundImage).trim();
    const sizeMm = PAGE_SIZES_MM[pageSize] || PAGE_SIZES_MM.A5;
    const usePageWrapper = options.usePageWrapper !== false;
    const content = renderNode(flow.root, data);
    if (!usePageWrapper) return <div className={options.className} style={options.style}>{content}</div>;
    const pageStyle = {
        width: `${sizeMm.width}mm`,
        minHeight: `${sizeMm.height}mm`,
        backgroundColor: pageBg,
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...(pageBgImage ? { backgroundImage: `url(${pageBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
        ...options.style
    };
    return (
        <div className={options.className} style={pageStyle}>
            {content}
        </div>
    );
}
