import React, { useState, useEffect, useRef } from "react";
import { useHistory, Link } from "react-router-dom";
import { Actions } from "Constants/permissions";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import Swal from 'sweetalert2';
import sampleData from './sample_student_mark_data.json';
import { predefinedTemplates } from './predefinedTemplates';
import FieldMapper from './FieldMapper';
import { getFlowTemplateData, migrateAbsoluteToRelative, boxSpacingToCss, createContentElement, getTableTrTdCss } from './layoutSchema';
import LayoutRenderer from './LayoutRenderer';
import Select from 'react-select';
import "./Design.css";

const Design = () => {
    const history = useHistory();
    const [data, setData] = useState(null);
    const [pageSize, setPageSize] = useState('A4');
    const [pageBg, setPageBg] = useState('#ffffff');
    const [pageBackgroundImage, setPageBackgroundImage] = useState('');
    const [backgroundImageUrlInput, setBackgroundImageUrlInput] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateName, setTemplateName] = useState('');
    const [elements, setElements] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [draggingElement, setDraggingElement] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showFieldMapper, setShowFieldMapper] = useState(false);
    const [fieldMapperTarget, setFieldMapperTarget] = useState(null);
    const [zoom, setZoom] = useState(100);
    const [showGrid, setShowGrid] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resizingElement, setResizingElement] = useState(null);
    const [resizeHandle, setResizeHandle] = useState(null);
    const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const canvasRef = useRef(null);
    const dragStartIndexRef = useRef(null);
    const dropIndicatorIndexRef = useRef(null);
    const [rootLayout, setRootLayout] = useState({ padding: 0, gap: 8, margin: 0 });
    const [dropIndicatorIndex, setDropIndicatorIndex] = useState(null);
    const [sidebarDragType, setSidebarDragType] = useState(null);
    const [dropZoneHoverIndex, setDropZoneHoverIndex] = useState(null);
    const [dropZoneHoverRowId, setDropZoneHoverRowId] = useState(null);
    /** First dropdown: options from GET_URL (api names). No separate API for list. */
    const dataListOptions = Object.keys(GET_URL || {}).map((key) => ({ value: key, label: key }));
    const [selectedApiName, setSelectedApiName] = useState('');
    const [mappingDataList, setMappingDataList] = useState([]);
    const [apiResponseLoading, setApiResponseLoading] = useState(false);
    const [sampleJsonList, setSampleJsonList] = useState([]);
    const [selectedSampleJson, setSelectedSampleJson] = useState('');
    const [sampleJsonLoading, setSampleJsonLoading] = useState(false);
    /** Two-phase editor: 'layout' = drag-and-drop to create layout boxes; 'design' = add elements inside each box */
    const [editorStep, setEditorStep] = useState('layout');

    const pageSizes = {
        A4: { width: 210, height: 297 },
        A5: { width: 148, height: 210 },
        A3: { width: 297, height: 420 }
    };

    /** When user selects an API name (GET_URL key), hit GET_URL[apiname].api and load response.data?.data?.data_list for mapping */
    const handleSelectApiName = async (apiname) => {
        if (!apiname) {
            setSelectedApiName('');
            setMappingDataList([]);
            setSelectedElement(null);
            return;
        }
        setSelectedApiName(apiname);
        const urlConfig = GET_URL[apiname];
        const apiPath = urlConfig?.api;
        if (!apiPath) {
            console.error('GET_URL has no key:', apiname);
            setMappingDataList([]);
            return;
        }
        try {
            setApiResponseLoading(true);
            const response = await getRequest(apiPath);
            const list = response?.data?.data?.data_list;
            setMappingDataList(Array.isArray(list) ? list : []);
            // Store full response.data so paths like "data.student_list.0.name" resolve correctly
            const payload = response?.data ?? response;
            if (payload != null) setData(payload);
        } catch (err) {
            console.error('Fetch mapping data:', err);
            setMappingDataList([]);
        } finally {
            setApiResponseLoading(false);
        }
    };

    /** Load dropdown options from template_sample_json API.
     * Backend returns list of { id, template_name, template_data, created, modified }.
     */
    const loadSampleJsonList = async () => {
        try {
            setSampleJsonLoading(true);
            const urlConfig = GET_URL.template_sample_json;
            const apiPath = urlConfig?.api;
            if (!apiPath) {
                console.error('template_sample_json API not found in GET_URL');
                setSampleJsonList([]);
                return;
            }
            const response = await getRequest(apiPath);
            const data = response?.data ?? response;
            const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? []);
            const arr = Array.isArray(list) ? list : [];
            setSampleJsonList(arr);
        } catch (err) {
            console.error('Fetch sample JSON list:', err);
            setSampleJsonList([]);
        } finally {
            setSampleJsonLoading(false);
        }
    };

    /** Parse JSON from template_data key (string or object) */
    const getJsonFromTemplateData = (templateData) => {
        if (templateData == null) return null;
        if (typeof templateData === 'object') return templateData;
        if (typeof templateData === 'string') {
            try {
                return JSON.parse(templateData);
            } catch (_) {
                return null;
            }
        }
        return null;
    };

    /** Load selected sample JSON. Backend detail shape: { id, template_name, template_data, created, modified }. */
    const handleSelectSampleJson = async (sampleId) => {
        if (!sampleId) {
            setSelectedSampleJson('');
            return;
        }
        setSelectedSampleJson(String(sampleId));
        const urlConfig = GET_URL.template_sample_json;
        const apiPath = urlConfig?.api;
        if (!apiPath) {
            Swal.fire('Error', 'Sample JSON API not configured', 'error');
            return;
        }
        try {
            setSampleJsonLoading(true);
            let payload = null;
            const listItem = sampleJsonList.find(
                (item) => String(item.id) === String(sampleId) || String(item.name) === String(sampleId)
            );
            if (listItem && listItem.template_data != null) {
                payload = getJsonFromTemplateData(listItem.template_data);
            }
            if (payload == null) {
                const basePath = apiPath.replace(/\/$/, '');
                const url = `${basePath}${sampleId.toString().startsWith('/') ? '' : '/'}${sampleId}/`;
                const response = await getRequest(url);
                const data = response?.data ?? response;
                const item = data?.data ?? data;
                const templateDataRaw = item?.template_data;
                payload = getJsonFromTemplateData(templateDataRaw);
            }
            if (payload != null && typeof payload === 'object') {
                setData(payload);
                setSelectedStudentIndex(0);
                setPreviewData(null);
                Swal.fire('Success', 'Sample JSON loaded successfully', 'success');
            } else {
                Swal.fire('Warning', 'No template_data in response', 'warning');
            }
        } catch (err) {
            console.error('Load sample JSON:', err);
            Swal.fire('Error', err?.response?.data?.message || 'Failed to load sample JSON', 'error');
        } finally {
            setSampleJsonLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
        loadSampleJsonList();
        // Create multiple sample students for selection
        const enhancedData = {
            ...sampleData,
            data: {
                ...sampleData.data,
                student_list: [
                    sampleData.data.student_list[0],
                    {
                        ...sampleData.data.student_list[0],
                        student: 2,
                        student_name: "Jane Smith",
                        first_name: "Jane",
                        last_name: "Smith",
                        current_reg_num: "REG002",
                        dob: "2010-08-20",
                        subject_list_data: [
                            {
                                subject: 1,
                                subject_name: "Mathematics",
                                marks: 95,
                                max_marks: 100,
                                total_obtained_marks: 95,
                                total_max_marks: 100,
                                grade: "A+",
                                attendance_status: "Present"
                            },
                            {
                                subject: 2,
                                subject_name: "Science",
                                marks: 88,
                                max_marks: 100,
                                total_obtained_marks: 88,
                                total_max_marks: 100,
                                grade: "A",
                                attendance_status: "Present"
                            },
                            {
                                subject: 3,
                                subject_name: "English",
                                marks: 92,
                                max_marks: 100,
                                total_obtained_marks: 92,
                                total_max_marks: 100,
                                grade: "A+",
                                attendance_status: "Present"
                            }
                        ],
                        total_summary: {
                            total_obtained_marks: 275,
                            total_marks: 300,
                            percentage: 91.67,
                            total_obtained_marks_in_word: "two hundred seventy-five"
                        },
                        grade: "A+"
                    },
                    {
                        ...sampleData.data.student_list[0],
                        student: 3,
                        student_name: "Robert Johnson",
                        first_name: "Robert",
                        last_name: "Johnson",
                        current_reg_num: "REG003",
                        dob: "2010-03-10",
                        subject_list_data: [
                            {
                                subject: 1,
                                subject_name: "Mathematics",
                                marks: 72,
                                max_marks: 100,
                                total_obtained_marks: 72,
                                total_max_marks: 100,
                                grade: "B",
                                attendance_status: "Present"
                            },
                            {
                                subject: 2,
                                subject_name: "Science",
                                marks: 68,
                                max_marks: 100,
                                total_obtained_marks: 68,
                                total_max_marks: 100,
                                grade: "B",
                                attendance_status: "Present"
                            },
                            {
                                subject: 3,
                                subject_name: "English",
                                marks: 75,
                                max_marks: 100,
                                total_obtained_marks: 75,
                                total_max_marks: 100,
                                grade: "B+",
                                attendance_status: "Present"
                            }
                        ],
                        total_summary: {
                            total_obtained_marks: 215,
                            total_marks: 300,
                            percentage: 71.67,
                            total_obtained_marks_in_word: "two hundred fifteen"
                        },
                        grade: "B"
                    }
                ]
            }
        };
        setData(enhancedData);
        setPreviewData(enhancedData);
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await getRequest(GET_URL.customdesigntemplate.api, { module: 'marks_card' });
            if (response && response.data) {
                setTemplates(response.data);
            }
        } catch (error) {
            console.error("Error loading templates:", error);
        }
    };

    const addElement = (type, parentRowId = null) => {
        const newElement = createContentElement(type);
        if (parentRowId) {
            // Add to row
            const addToRow = (els) => {
                return els.map(el => {
                    if (el.id === parentRowId && el.type === 'row') {
                        return { ...el, children: [...(el.children || []), newElement] };
                    }
                    if (el.type === 'row' && el.children) {
                        return { ...el, children: addToRow(el.children) };
                    }
                    return el;
                });
            };
            setElements(addToRow(elements));
        } else {
            // Add to root
            setElements([...elements, newElement]);
        }
        setSelectedElement(newElement);
    };

    const addRow = () => {
        const newRow = {
            id: `el_${Date.now()}_${Math.random()}`,
            type: 'row',
            margin: 0,
            padding: 0,
            gap: 8,
            flexDirection: 'row',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            width: '100%',
            children: []
        };
        setElements([...elements, newRow]);
        setSelectedElement(newRow);
    };

    const insertElementAt = (type, index, parentRowId = null) => {
        const newElement = createContentElement(type);
        if (parentRowId) {
            const addToRowAt = (els) => {
                return els.map(el => {
                    if (el.id === parentRowId && el.type === 'row') {
                        const children = [...(el.children || [])];
                        children.splice(Math.min(index, children.length), 0, newElement);
                        return { ...el, children };
                    }
                    if (el.type === 'row' && el.children) {
                        return { ...el, children: addToRowAt(el.children) };
                    }
                    return el;
                });
            };
            setElements(addToRowAt(elements));
        } else {
            const next = [...elements];
            next.splice(Math.max(0, Math.min(index, next.length)), 0, newElement);
            setElements(next);
        }
        setSelectedElement(newElement);
    };

    const addMultipleElements = (type, count, parentRowId = null) => {
        const n = Math.max(1, Math.min(50, parseInt(count, 10) || 1));
        const parentRow = parentRowId ? elements.find(el => el.type === 'row' && el.id === parentRowId) : null;
        if (parentRow) {
            const newEls = Array.from({ length: n }, () => createContentElement(type));
            const updateRow = (els) => els.map(el => {
                if (el.id === parentRowId && el.type === 'row') {
                    return { ...el, children: [...(el.children || []), ...newEls] };
                }
                if (el.type === 'row' && el.children) {
                    return { ...el, children: updateRow(el.children) };
                }
                return el;
            });
            setElements(updateRow(elements));
            setSelectedElement(newEls[newEls.length - 1]);
        } else {
            const newEls = Array.from({ length: n }, () => createContentElement(type));
            setElements([...elements, ...newEls]);
            setSelectedElement(newEls[newEls.length - 1]);
        }
    };

    const updateElement = (id, updates) => {
        const updateRecursive = (els) => {
            return els.map(el => {
                if (el.id === id) {
                    return { ...el, ...updates };
                }
                if (el.type === 'row' && el.children) {
                    return { ...el, children: updateRecursive(el.children) };
                }
                return el;
            });
        };
        setElements(updateRecursive(elements));
        if (selectedElement && selectedElement.id === id) {
            setSelectedElement({ ...selectedElement, ...updates });
        }
    };

    const deleteElement = (id) => {
        const deleteRecursive = (els) => {
            return els.filter(el => {
                if (el.id === id) return false;
                if (el.type === 'row' && el.children) {
                    el.children = deleteRecursive(el.children);
                }
                return true;
            });
        };
        setElements(deleteRecursive(elements));
        if (selectedElement && selectedElement.id === id) {
            setSelectedElement(null);
        }
    };

    const getValue = (path) => {
        if (!data || !path || typeof path !== 'string') return '';
        const keys = path.trim().split('.').filter(Boolean);
        if (keys.length === 0) return data;
        const resolve = (obj) => {
            let value = obj;
            for (const key of keys) {
                if (value == null || typeof value !== 'object') return undefined;
                value = /^\d+$/.test(key) ? (Array.isArray(value) ? value[parseInt(key, 10)] : undefined) : value[key];
            }
            return value;
        };
        let value = resolve(data);
        // If path has no "data." prefix and root has "data", try from data.data (e.g. "student_list.0.name")
        if (value === undefined && data && typeof data === 'object' && data.data && keys[0] !== 'data') {
            value = resolve(data.data);
        }
        return value !== undefined && value !== null ? value : '';
    };

    /** Build data path options from nested object (e.g. sample JSON template_data) for mapping dropdown */
    const buildPathsFromData = (obj, prefix = '', list = []) => {
        if (obj == null || typeof obj !== 'object') return list;
        const keys = Object.keys(obj);
        for (const key of keys) {
            const path = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            list.push({ value: path, label: path });
            if (value != null && typeof value === 'object' && !(value instanceof Date)) {
                if (Array.isArray(value) && value.length > 0) {
                    buildPathsFromData(value[0], `${path}.0`, list);
                } else if (!Array.isArray(value)) {
                    buildPathsFromData(value, path, list);
                }
            }
        }
        return list;
    };

    /** Data path options: from Select API (data_list) or from Sample JSON template_data — either is enough to map */
    const effectiveMappingDataList = (() => {
        if (selectedApiName && mappingDataList && mappingDataList.length > 0) return mappingDataList;
        if (!data || typeof data !== 'object') return [];
        const fromData = buildPathsFromData(data);
        const seen = new Set();
        return fromData.filter((item) => {
            const v = item.value != null ? item.value : item.path;
            if (seen.has(v)) return false;
            seen.add(v);
            return true;
        });
    })();

    const handleMouseDown = (e, element) => {
        if (!selectedApiName && !selectedSampleJson) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('input') || e.target.closest('button')) {
            return;
        }
        e.stopPropagation();
        setSelectedElement(element);
        setDraggingElement(element.id);
        const idx = elements.findIndex(el => el.id === element.id);
        setDropIndicatorIndex(null);
        dragStartIndexRef.current = idx >= 0 ? idx : null;
        dropIndicatorIndexRef.current = null;
        const rect = canvasRef.current.getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseMove = (e) => {
        if (!draggingElement || !canvasRef.current || elements.length === 0) return;
        const clientY = e.clientY;
        let insertBeforeIndex = 0;
        for (let i = 0; i < elements.length; i++) {
            const wrapper = canvasRef.current.querySelector(`[data-element-id="${elements[i].id}"]`);
            if (!wrapper) continue;
            const rect = wrapper.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (clientY < mid) {
                insertBeforeIndex = i;
                break;
            }
            insertBeforeIndex = i + 1;
        }
        setDropIndicatorIndex(insertBeforeIndex);
        dropIndicatorIndexRef.current = insertBeforeIndex;
    };

    const handleMouseUp = () => {
        const startIdx = dragStartIndexRef.current;
        const dropIdx = dropIndicatorIndexRef.current;
        if (draggingElement != null && startIdx != null && dropIdx != null) {
            const insertAt = dropIdx > startIdx ? dropIdx - 1 : dropIdx;
            if (insertAt !== startIdx) {
                const dragged = elements[startIdx];
                const newOrder = elements.filter((_, i) => i !== startIdx);
                newOrder.splice(insertAt, 0, dragged);
                setElements(newOrder);
                setSelectedElement(dragged);
            }
        }
        setDraggingElement(null);
        setDropIndicatorIndex(null);
        dragStartIndexRef.current = null;
        dropIndicatorIndexRef.current = null;
        setResizingElement(null);
        setResizeHandle(null);
    };

    const findElementById = (els, id) => {
        for (const el of els) {
            if (el.id === id) return el;
            if (el.type === 'row' && el.children?.length) {
                const found = findElementById(el.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const handleResizeMouseMove = (e) => {
        if (resizingElement && resizeHandle && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const wrapper = canvasRef.current.querySelector(`[data-element-id="${resizingElement}"]`);
            const element = findElementById(elements, resizingElement);
            if (!element || !wrapper) return;
            const elRect = wrapper.getBoundingClientRect();
            const elLeft = elRect.left - rect.left;
            const elTop = elRect.top - rect.top;
            const maxW = pageSizes[pageSize].width * 3.78;
            const maxH = pageSizes[pageSize].height * 3.78;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Get current width/height as pixels
            let currentWidth = element.width;
            if (typeof currentWidth === 'string') {
                if (currentWidth === '100%' || currentWidth === 'auto') {
                    currentWidth = elRect.width;
                } else if (currentWidth.endsWith('%')) {
                    const percent = parseFloat(currentWidth) / 100;
                    currentWidth = maxW * percent;
                } else if (currentWidth.endsWith('px')) {
                    currentWidth = parseFloat(currentWidth);
                } else {
                    currentWidth = elRect.width;
                }
            }
            
            let currentHeight = element.height;
            if (typeof currentHeight === 'string') {
                if (currentHeight === 'auto') {
                    currentHeight = elRect.height;
                } else if (currentHeight.endsWith('%')) {
                    const percent = parseFloat(currentHeight) / 100;
                    currentHeight = maxH * percent;
                } else if (currentHeight.endsWith('px')) {
                    currentHeight = parseFloat(currentHeight);
                } else {
                    currentHeight = elRect.height;
                }
            }
            
            let newWidth = currentWidth || elRect.width;
            let newHeight = currentHeight || elRect.height;
            
            if (resizeHandle.includes('e')) {
                newWidth = Math.max(50, Math.min(mouseX - elLeft, maxW - elLeft));
            }
            if (resizeHandle.includes('w')) {
                const right = elLeft + currentWidth;
                newWidth = Math.max(50, Math.min(right - mouseX, right));
            }
            if (resizeHandle.includes('s')) {
                newHeight = Math.max(30, Math.min(mouseY - elTop, maxH - elTop));
            }
            if (resizeHandle.includes('n')) {
                const bottom = elTop + currentHeight;
                newHeight = Math.max(30, Math.min(bottom - mouseY, bottom));
            }
            
            // Always save as pixels (numbers) for tables and other elements
            updateElement(resizingElement, { width: Math.round(newWidth), height: Math.round(newHeight) });
        }
    };

    useEffect(() => {
        if (resizingElement) {
            document.addEventListener('mousemove', handleResizeMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleResizeMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizingElement, resizeHandle, elements, pageSize]);

    useEffect(() => {
        if (draggingElement) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [draggingElement, elements]);

    const getTemplateDataForSave = () => {
        const processElements = (els) => {
            return els.map((el) => {
                if (el?.type === 'table') {
                    const { tr, td } = getTableTrTdCss(el);
                    return { ...el, tr, td };
                }
                if (el?.type === 'row' && el.children) {
                    return { ...el, children: processElements(el.children) };
                }
                if (el?.type === 'shape') {
                    return {
                        ...el,
                        shapeKind: el.shapeKind && ['rect', 'circle', 'ellipse', 'line'].includes(el.shapeKind) ? el.shapeKind : 'rect',
                        backgroundColor: el.backgroundColor ?? 'transparent',
                        borderColor: el.borderColor ?? '#000000',
                        borderWidth: el.borderWidth != null ? el.borderWidth : 1,
                        borderStyle: el.borderStyle ?? 'solid',
                        borderRadius: el.borderRadius != null ? el.borderRadius : 0
                    };
                }
                return el;
            });
        };
        return {
            layoutVersion: 2,
            pageSize,
            pageBg,
            pageBackgroundImage: pageBackgroundImage || undefined,
            root: {
                id: 'root',
                type: 'section',
                margin: rootLayout.margin,
                padding: rootLayout.padding,
                gap: rootLayout.gap,
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                children: processElements(elements)
            }
        };
    };

    const saveTemplate = async () => {
        console.log('saveTemplate', templateName);
        if (!templateName.trim()) {
            alert('Enter Name to Save Template')
            return;
        }

        console.log('saveTemplate', templateName);

            const templateData = {
                name: templateName,
                description: '',
                template_data: getTemplateDataForSave(),
                sample_data: data,
                module: 'marks_card',
                template_type: 'pdf'
            };

            let response;
            if (selectedTemplate) {
                response = await putRequest(PUT_URL.customdesigntemplate.api, selectedTemplate.id, templateData);
            } else {
                response = await postRequest(POST_URL.customdesigntemplate.api, templateData);
            }

            if (response) {
                alert('Template saved successfully');
                setTemplateName('');
                setSelectedTemplate(null);
                loadTemplates();
            }
    };

    const loadTemplate = (template) => {
        setSelectedTemplate(template);
        setTemplateName(template.name);
        if (template.template_data) {
            const td = template.template_data;
            setPageSize(td.pageSize || 'A4');
            setPageBg(td.pageBg || '#ffffff');
            setPageBackgroundImage(td.pageBackgroundImage || '');
            if (td.layoutVersion === 2 && td.root && Array.isArray(td.root.children)) {
                setElements(td.root.children);
                setRootLayout({ padding: td.root.padding ?? 0, gap: td.root.gap ?? 8, margin: td.root.margin ?? 0 });
            } else {
                const els = td.elements || [];
                const migrated = migrateAbsoluteToRelative({ ...td, elements: els });
                setElements(migrated.root ? migrated.root.children : els);
                setRootLayout(migrated.root ? { padding: migrated.root.padding ?? 0, gap: migrated.root.gap ?? 8, margin: migrated.root.margin ?? 0 } : { padding: 0, gap: 8, margin: 0 });
            }
        }
        if (template.sample_data) setData(template.sample_data);
        setSelectedElement(null);
    };

    const loadPredefinedTemplate = (templateKey) => {
        const template = predefinedTemplates[templateKey];
        if (template) {
            setPageSize(template.pageSize);
            setPageBg(template.pageBg);
            const legacyElements = template.elements.map(el => ({ ...el, id: Date.now() + Math.random() }));
            const migrated = migrateAbsoluteToRelative({ pageSize: template.pageSize, pageBg: template.pageBg, elements: legacyElements });
            setElements(migrated.root.children);
            setRootLayout({ padding: migrated.root.padding ?? 0, gap: migrated.root.gap ?? 8, margin: migrated.root.margin ?? 0 });
            setSelectedElement(null);
            setSelectedStudentIndex(0);
            Swal.fire('Success', `${template.name} loaded! Drag to reorder, adjust margin for spacing.`, 'success');
        }
    };

    const renderTableWithStyles = (element, headers, tableData, getHeaderLabel) => {
        const getColumnStyle = (col, idx, isTh = false) => {
            const colStyles = element.columnStyles?.[col] || {};
            const isFirst = idx === 0;
            const isLast = idx === headers.length - 1;
            const borderRadius = [];
            if (isFirst) {
                if (colStyles.borderRadiusTopLeft) borderRadius.push(`${colStyles.borderRadiusTopLeft}px`);
                if (colStyles.borderRadiusBottomLeft) borderRadius.push(`${colStyles.borderRadiusBottomLeft}px`);
            }
            if (isLast) {
                if (colStyles.borderRadiusTopRight) borderRadius.push(`${colStyles.borderRadiusTopRight}px`);
                if (colStyles.borderRadiusBottomRight) borderRadius.push(`${colStyles.borderRadiusBottomRight}px`);
            }
            return {
                backgroundColor: isTh 
                    ? (colStyles.thBackgroundColor || element.thCss?.backgroundColor || element.backgroundColor || '#f0f0f0')
                    : (colStyles.tdBackgroundColor || element.tdCss?.backgroundColor || '#ffffff'),
                textAlign: isTh 
                    ? (colStyles.thTextAlign || element.thCss?.textAlign || 'center')
                    : (colStyles.tdTextAlign || (isFirst ? 'left' : 'center')),
                borderRadius: borderRadius.length > 0 ? borderRadius.join(' ') : undefined
            };
        };

        return (
            <table style={{
                width: '100%',
                height: '100%',
                fontSize: element.fontSize || 10,
                borderCollapse: 'collapse',
                tableLayout: 'fixed'
            }}>
                {element.topHeaderRow?.enabled && (
                    <thead>
                        <tr>
                            <th
                                colSpan={headers.length}
                                style={{
                                    backgroundColor: element.topHeaderRow.backgroundColor || '#1e3a8a',
                                    color: element.topHeaderRow.color || '#ffffff',
                                    fontSize: `${element.topHeaderRow.fontSize || 16}px`,
                                    fontWeight: element.topHeaderRow.fontWeight || 'bold',
                                    textAlign: 'center',
                                    padding: element.thCss?.padding ? `${element.thCss.padding}px` : '8px',
                                    borderTopLeftRadius: `${element.topHeaderRow.borderRadius || 8}px`,
                                    borderTopRightRadius: `${element.topHeaderRow.borderRadius || 8}px`,
                                    borderBottomLeftRadius: '0',
                                    borderBottomRightRadius: '0',
                                    border: `${element.thCss?.borderWidth || 1}px ${element.thCss?.borderStyle || 'solid'} ${element.thCss?.borderColor || '#000000'}`,
                                    borderBottom: 'none'
                                }}
                            >
                                {element.topHeaderRow.text || 'CONSOLIDATED MARKS'}
                            </th>
                        </tr>
                    </thead>
                )}
                <thead>
                    <tr>
                        {headers.map((h, idx) => {
                            const colStyle = getColumnStyle(h, idx, true);
                            let thStyle = {};
                            if (element.thCss) {
                                const borderWidth = element.thCss.borderWidth ?? 1;
                                const borderColor = element.thCss.borderColor || '#000000';
                                const borderStyle = element.thCss.borderStyle || 'solid';
                                thStyle = {
                                    border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                                    borderRadius: colStyle.borderRadius || (element.thCss.borderRadius ? `${element.thCss.borderRadius}px` : undefined),
                                    padding: element.thCss.padding ? `${element.thCss.padding}px` : '4px',
                                    backgroundColor: colStyle.backgroundColor,
                                    color: element.thCss.color || element.color || '#000000',
                                    fontSize: element.thCss.fontSize ? `${element.thCss.fontSize}px` : undefined,
                                    fontWeight: element.thCss.fontWeight || 'bold',
                                    textAlign: colStyle.textAlign,
                                    height: element.thCss.height ? `${element.thCss.height}px` : undefined
                                };
                            } else {
                                thStyle = {
                                    border: '1px solid #ccc',
                                    padding: '4px',
                                    backgroundColor: colStyle.backgroundColor,
                                    fontWeight: 'bold',
                                    textAlign: colStyle.textAlign
                                };
                            }
                            return <th key={h} style={thStyle}>{getHeaderLabel(h)}</th>;
                        })}
                    </tr>
                </thead>
                <tbody>
                    {tableData.slice(0, Math.floor((element.height - 40) / (element.trCss?.height || 25))).map((row, i) => {
                        let trStyle = {};
                        if (element.trCss) {
                            const borderWidth = element.trCss.borderWidth ?? 1;
                            const borderColor = element.trCss.borderColor || '#000000';
                            const borderStyle = element.trCss.borderStyle || 'solid';
                            trStyle = {
                                height: element.trCss.height ? `${element.trCss.height}px` : undefined,
                                border: `${borderWidth}px ${borderStyle} ${borderColor}`
                            };
                        }
                        return (
                            <tr key={i} style={trStyle}>
                                {headers.map((h, idx) => {
                                    const colStyle = getColumnStyle(h, idx, false);
                                    let tdStyle = {};
                                    if (element.tdCss) {
                                        const borderWidth = element.tdCss.borderWidth ?? 1;
                                        const borderColor = element.tdCss.borderColor || '#000000';
                                        const borderStyle = element.tdCss.borderStyle || 'solid';
                                        tdStyle = {
                                            border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                                            borderRadius: colStyle.borderRadius || (element.tdCss.borderRadius ? `${element.tdCss.borderRadius}px` : undefined),
                                            padding: element.tdCss.padding ? `${element.tdCss.padding}px` : '4px',
                                            backgroundColor: colStyle.backgroundColor,
                                            color: element.tdCss.color || element.color || '#000000',
                                            fontSize: element.tdCss.fontSize ? `${element.tdCss.fontSize}px` : undefined,
                                            textAlign: colStyle.textAlign,
                                            height: element.tdCss.height ? `${element.tdCss.height}px` : undefined,
                                            wordWrap: 'break-word',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        };
                                    } else {
                                        tdStyle = {
                                            border: '1px solid #ccc',
                                            padding: '4px',
                                            backgroundColor: colStyle.backgroundColor,
                                            textAlign: colStyle.textAlign,
                                            wordWrap: 'break-word',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        };
                                    }
                                    return <td key={h} style={tdStyle}>{String(row[h] || '')}</td>;
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const getPreviewData = () => {
        if (!data || !data.data || !data.data.student_list) return data;
        const studentData = data.data.student_list[selectedStudentIndex];
        if (!studentData) return data;

        return {
            ...data,
            data: {
                ...data.data,
                student_list: [studentData]
            }
        };
    };

    const renderPreviewElement = (element, previewData) => {
        const getValue = (path) => {
            if (!previewData || !path) return '';
            const keys = path.split('.');
            let value = previewData;
            for (const key of keys) {
                if (value && typeof value === 'object') {
                    if (/^\d+$/.test(key)) {
                        value = Array.isArray(value) ? value[parseInt(key)] : undefined;
                    } else {
                        value = value[key];
                    }
                } else {
                    return '';
                }
            }
            return value || '';
        };

        switch (element.type) {
            case 'label':
                return (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${element.fontSize}px`,
                        color: element.color,
                        fontWeight: element.fontWeight,
                        fontStyle: element.fontStyle || 'normal',
                        textDecoration: element.textDecoration || 'none',
                        fontFamily: element.fontFamily || 'Arial, sans-serif',
                        textAlign: element.textAlign,
                        display: 'flex',
                        alignItems: 'center',
                        padding: `${element.padding || 5}px`,
                        border: `${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || '#000000'}`,
                        borderRadius: `${element.borderRadius || 0}px`,
                        backgroundColor: element.backgroundColor || 'transparent'
                    }}>
                        {element.text || 'Label'}
                    </div>
                );

            case 'value':
                const value = element.dataPath ? getValue(element.dataPath) : '';
                return (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${element.fontSize}px`,
                        color: element.color,
                        fontWeight: element.fontWeight,
                        fontStyle: element.fontStyle || 'normal',
                        textDecoration: element.textDecoration || 'none',
                        fontFamily: element.fontFamily || 'Arial, sans-serif',
                        textAlign: element.textAlign,
                        display: 'flex',
                        alignItems: 'center',
                        padding: `${element.padding || 5}px`,
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        border: `${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || '#000000'}`,
                        borderRadius: `${element.borderRadius || 0}px`,
                        backgroundColor: element.backgroundColor || 'transparent'
                    }}>
                        {value ? String(value) : 'No data'}
                    </div>
                );

            case 'table':
                const tableData = element.dataPath && getValue(element.dataPath);
                if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                    // Get all available columns from first row
                    const allColumns = Object.keys(tableData[0]);

                    // Use selected columns if defined and not empty, otherwise use all columns
                    const headers = element.selectedColumns && element.selectedColumns.length > 0
                        ? element.selectedColumns.filter(col => allColumns.includes(col))
                        : allColumns;

                    // Get custom header label or use formatted column name
                    const getHeaderLabel = (col) => {
                        return element.columnHeaders?.[col] || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    };

                    return renderTableWithStyles(element, headers, tableData, getHeaderLabel);
                }
                return (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#999',
                        fontSize: '12px'
                    }}>
                        No data
                    </div>
                );

            case 'image': {
                const imageFromData = element.dataPath ? getValue(element.dataPath) : '';
                const imageSrc = element.imageUrl || imageFromData || '';
                return (
                    <img
                        src={imageSrc || 'https://via.placeholder.com/100'}
                        alt=""
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: imageSrc ? 'block' : 'none'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                );
            }

            case 'shape': {
                const kind = element.shapeKind || 'rect';
                const fill = element.backgroundColor || 'transparent';
                const stroke = element.borderColor || '#000000';
                const strokeW = element.borderWidth != null ? element.borderWidth : 1;
                const w = 100, h = 100;
                return (
                    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                        {kind === 'rect' && <rect x={strokeW / 2} y={strokeW / 2} width={w - strokeW} height={h - strokeW} fill={fill} stroke={stroke} strokeWidth={strokeW} rx={element.borderRadius || 0} />}
                        {kind === 'circle' && <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - strokeW / 2} fill={fill} stroke={stroke} strokeWidth={strokeW} />}
                        {kind === 'ellipse' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - strokeW / 2} ry={h / 2 - strokeW / 2} fill={fill} stroke={stroke} strokeWidth={strokeW} />}
                        {kind === 'line' && <line x1={strokeW} y1={strokeW} x2={w - strokeW} y2={h - strokeW} stroke={stroke} strokeWidth={strokeW} />}
                    </svg>
                );
            }

            default:
                return null;
        }
    };

    const handleClose = () => {
        history.push('/dashboard');
    };

    const currentSize = pageSizes[pageSize];
    const zoomFactor = zoom / 100;

    const renderElement = (element) => {
        const isSelected = selectedElement && selectedElement.id === element.id;

        switch (element.type) {
            case 'label':
                return (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${element.fontSize}px`,
                        color: element.color,
                        fontWeight: element.fontWeight,
                        fontStyle: element.fontStyle || 'normal',
                        textDecoration: element.textDecoration || 'none',
                        fontFamily: element.fontFamily || 'Arial, sans-serif',
                        textAlign: element.textAlign,
                        display: 'flex',
                        alignItems: 'center',
                        padding: `${element.padding || 5}px`,
                        border: `${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || '#000000'}`,
                        borderRadius: `${element.borderRadius || 0}px`,
                        backgroundColor: element.backgroundColor || 'transparent'
                    }}>
                        {element.text || 'Label'}
                    </div>
                );

            case 'value':
                const value = element.dataPath ? getValue(element.dataPath) : '';
                return (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${element.fontSize}px`,
                        color: element.color,
                        fontWeight: element.fontWeight,
                        fontStyle: element.fontStyle || 'normal',
                        textDecoration: element.textDecoration || 'none',
                        fontFamily: element.fontFamily || 'Arial, sans-serif',
                        textAlign: element.textAlign,
                        display: 'flex',
                        alignItems: 'center',
                        padding: `${element.padding || 5}px`,
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        border: `${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || '#000000'}`,
                        borderRadius: `${element.borderRadius || 0}px`,
                        backgroundColor: element.backgroundColor || 'transparent'
                    }}>
                        {value ? String(value) : 'No data'}
                    </div>
                );

            case 'table':
                const tableData = element.dataPath && getValue(element.dataPath);
                if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                    // Get all available columns from first row
                    const allColumns = Object.keys(tableData[0]);

                    // Use selected columns if defined and not empty, otherwise use all columns
                    const headers = element.selectedColumns && element.selectedColumns.length > 0
                        ? element.selectedColumns.filter(col => allColumns.includes(col))
                        : allColumns;

                    // Get custom header label or use formatted column name
                    const getHeaderLabel = (col) => {
                        return element.columnHeaders?.[col] || col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    };

                    return (
                        <table style={{
                            width: '100%',
                            height: '100%',
                            fontSize: element.fontSize || 10,
                            borderCollapse: 'collapse',
                            tableLayout: 'fixed'
                        }}>
                            <thead>
                                <tr>
                                    {headers.map(h => {
                                        let thStyle = {};
                                        if (element.thCss) {
                                            const borderWidth = element.thCss.borderWidth ?? 1;
                                            const borderColor = element.thCss.borderColor || '#000000';
                                            const borderStyle = element.thCss.borderStyle || 'solid';
                                            thStyle = {
                                                border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                                                borderRadius: element.thCss.borderRadius ? `${element.thCss.borderRadius}px` : undefined,
                                                padding: element.thCss.padding ? `${element.thCss.padding}px` : '4px',
                                                backgroundColor: element.thCss.backgroundColor || element.backgroundColor || '#f0f0f0',
                                                color: element.thCss.color || element.color || '#000000',
                                                fontSize: element.thCss.fontSize ? `${element.thCss.fontSize}px` : undefined,
                                                fontWeight: element.thCss.fontWeight || 'bold',
                                                textAlign: element.thCss.textAlign || 'left',
                                                height: element.thCss.height ? `${element.thCss.height}px` : undefined
                                            };
                                        } else {
                                            thStyle = {
                                                border: '1px solid #ccc',
                                                padding: '4px',
                                                backgroundColor: element.backgroundColor || '#f0f0f0',
                                                fontWeight: 'bold',
                                                textAlign: 'left'
                                            };
                                        }
                                        return <th key={h} style={thStyle}>{getHeaderLabel(h)}</th>;
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.slice(0, Math.floor((element.height - 40) / (element.trCss?.height || 25))).map((row, i) => {
                                    let trStyle = {};
                                    if (element.trCss) {
                                        const borderWidth = element.trCss.borderWidth ?? 1;
                                        const borderColor = element.trCss.borderColor || '#000000';
                                        const borderStyle = element.trCss.borderStyle || 'solid';
                                        trStyle = {
                                            height: element.trCss.height ? `${element.trCss.height}px` : undefined,
                                            border: `${borderWidth}px ${borderStyle} ${borderColor}`
                                        };
                                    }
                                    return (
                                        <tr key={i} style={trStyle}>
                                            {headers.map(h => {
                                                let tdStyle = {};
                                                if (element.tdCss) {
                                                    const borderWidth = element.tdCss.borderWidth ?? 1;
                                                    const borderColor = element.tdCss.borderColor || '#000000';
                                                    const borderStyle = element.tdCss.borderStyle || 'solid';
                                                    tdStyle = {
                                                        border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                                                        borderRadius: element.tdCss.borderRadius ? `${element.tdCss.borderRadius}px` : undefined,
                                                        padding: element.tdCss.padding ? `${element.tdCss.padding}px` : '4px',
                                                        backgroundColor: element.tdCss.backgroundColor || element.backgroundColor || undefined,
                                                        color: element.tdCss.color || element.color || '#000000',
                                                        fontSize: element.tdCss.fontSize ? `${element.tdCss.fontSize}px` : undefined,
                                                        textAlign: element.tdCss.textAlign || element.textAlign || 'left',
                                                        height: element.tdCss.height ? `${element.tdCss.height}px` : undefined,
                                                        wordWrap: 'break-word',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    };
                                                } else {
                                                    tdStyle = {
                                                        border: '1px solid #ccc',
                                                        padding: '4px',
                                                        wordWrap: 'break-word',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    };
                                                }
                                                return <td key={h} style={tdStyle}>{String(row[h] || '')}</td>;
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    );
                }
                return (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#999',
                        fontSize: '12px'
                    }}>
                        No data
                    </div>
                );

            case 'image': {
                const imageFromData = element.dataPath ? getValue(element.dataPath) : '';
                const imageSrc = element.imageUrl || imageFromData || '';
                return (
                    <img
                        src={imageSrc || 'https://via.placeholder.com/100'}
                        alt=""
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: imageSrc ? 'block' : 'none'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                );
            }

            case 'shape': {
                const kind = element.shapeKind || 'rect';
                const fill = element.backgroundColor || 'transparent';
                const stroke = element.borderColor || '#000000';
                const strokeW = element.borderWidth != null ? element.borderWidth : 1;
                const w = 100;
                const h = 100;
                return (
                    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                        {kind === 'rect' && <rect x={strokeW / 2} y={strokeW / 2} width={w - strokeW} height={h - strokeW} fill={fill} stroke={stroke} strokeWidth={strokeW} rx={element.borderRadius || 0} />}
                        {kind === 'circle' && <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2 - strokeW / 2} fill={fill} stroke={stroke} strokeWidth={strokeW} />}
                        {kind === 'ellipse' && <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - strokeW / 2} ry={h / 2 - strokeW / 2} fill={fill} stroke={stroke} strokeWidth={strokeW} />}
                        {kind === 'line' && <line x1={strokeW} y1={strokeW} x2={w - strokeW} y2={h - strokeW} stroke={stroke} strokeWidth={strokeW} />}
                    </svg>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className="custom-design-template-fullscreen">
            <div className="custom-design-template-header">
                <h2>📄 Custom Design Template</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, marginLeft: '24px' }}>
                    <div style={{ display: 'flex', gap: '0', background: '#e9ecef', borderRadius: '8px', padding: '3px', border: '1px solid #dee2e6' }}>
                        <button
                            onClick={() => setEditorStep('layout')}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: editorStep === 'layout' ? '#6f42c1' : 'transparent',
                                color: editorStep === 'layout' ? 'white' : '#495057',
                                transition: 'background 0.2s, color 0.2s'
                            }}
                        >
                            1. Layout
                        </button>
                        <button
                            onClick={() => setEditorStep('design')}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: editorStep === 'design' ? '#007bff' : 'transparent',
                                color: editorStep === 'design' ? 'white' : '#495057',
                                transition: 'background 0.2s, color 0.2s'
                            }}
                        >
                            2. Design
                        </button>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        {editorStep === 'layout' ? 'Drag boxes to build the page structure' : 'Add content inside each layout box'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        style={{ padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        {sidebarCollapsed ? '▶' : '◀'} Sidebar
                    </button>
                    <button className="custom-design-template-close-btn" onClick={handleClose}>✕ Close</button>
                </div>
            </div>

            <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
                {/* Left Sidebar */}
                {!sidebarCollapsed && (
                    <div style={{
                        width: '280px',
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        overflowY: 'auto',
                        borderRight: '1px solid #dee2e6'
                    }}>
                        {/* Select API — dropdown with built-in search; data_list from response.data?.data?.data_list */}
                        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '2px solid #007bff' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                                🔌 Select API
                            </label>
                            <Select
                                isSearchable
                                isClearable
                                placeholder="Search or select API..."
                                options={dataListOptions}
                                value={selectedApiName ? dataListOptions.find((o) => o.value === selectedApiName) : null}
                                onChange={(opt) => handleSelectApiName(opt ? opt.value : '')}
                                isLoading={apiResponseLoading}
                                styles={{
                                    control: (base) => ({ ...base, minHeight: '36px', fontSize: '12px' }),
                                    menu: (base) => ({ ...base, zIndex: 9999 }),
                                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                                }}
                                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                            />
                            {!selectedApiName && !selectedSampleJson && (
                                <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#fff3cd', borderRadius: '3px', fontSize: '11px', color: '#856404' }}>
                                    Select an API or choose Sample JSON below to add data path and enable editing.
                                </div>
                            )}
                            {(selectedApiName || selectedSampleJson) && effectiveMappingDataList.length > 0 && (
                                <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#d4edda', borderRadius: '3px', fontSize: '11px', color: '#155724' }}>
                                    ✓ {effectiveMappingDataList.length} field(s) available for mapping
                                </div>
                            )}
                        </div>

                        {/* Sample JSON from API — can use API data OR sample JSON */}
                        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                                📋 Sample JSON (from API)
                            </label>
                            <select
                                value={selectedSampleJson || 'default'}
                                onChange={(e) => {
                                    if (e.target.value === 'default') {
                                        setSelectedSampleJson('');
                                        setData(sampleData);
                                        Swal.fire('Info', 'Default JSON format loaded', 'info');
                                    } else {
                                        handleSelectSampleJson(e.target.value);
                                    }
                                }}
                                disabled={sampleJsonLoading}
                                style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}
                            >
                                <option value="default">Default (Student Marks)</option>
                                {sampleJsonList.map((item) => (
                                    <option key={item.id ?? item.name} value={item.id ?? item.name}>
                                        {item.template_name || item.name || item.title || `Sample ${item.id ?? ''}`}
                                    </option>
                                ))}
                            </select>
                            {sampleJsonLoading && (
                                <div style={{ marginTop: '5px', fontSize: '11px', color: '#6c757d' }}>Loading...</div>
                            )}
                            {data && (
                                <div style={{ marginTop: '8px', padding: '5px', backgroundColor: '#d4edda', borderRadius: '3px', fontSize: '11px' }}>
                                    ✓ Loaded: {data.data?.student_list?.length ?? 0} student(s)
                                </div>
                            )}
                            {Actions.add_sample_json?.view?.url && (
                                <div style={{ marginTop: '8px' }}>
                                    <Link to={Actions.add_sample_json.view.url} style={{ fontSize: '11px', color: '#007bff' }}>
                                        + Add new sample JSON
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Step 1: Layout — drag-and-drop layout boxes; shown in Layout mode (no API required) */}
                        {editorStep === 'layout' && (
                            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '2px solid #6f42c1' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#6f42c1' }}>
                                    📐 Layout boxes
                                </label>
                                <p style={{ fontSize: '11px', color: '#6c757d', marginBottom: '10px' }}>
                                    Drag layout boxes onto the canvas to build your page structure. Switch to <strong>Design</strong> to add content inside each box.
                                </p>
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        setSidebarDragType('row');
                                        e.dataTransfer.setData('application/x-element-type', 'row');
                                        e.dataTransfer.effectAllowed = 'copy';
                                        e.dataTransfer.setData('text/plain', 'row');
                                    }}
                                    onDragEnd={() => setSidebarDragType(null)}
                                    onClick={addRow}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        fontSize: '13px',
                                        background: '#6f42c1',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'grab',
                                        borderRadius: '6px',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        userSelect: 'none',
                                        boxShadow: '0 2px 6px rgba(111,66,193,0.3)'
                                    }}
                                >
                                    ＋ Add layout box
                                </div>
                                <p style={{ fontSize: '10px', color: '#6c757d', marginTop: '8px' }}>Click or drag onto canvas</p>
                            </div>
                        )}

                        {/* Page Settings & Save/Load in Layout mode (when no API selected yet) */}
                        {editorStep === 'layout' && (
                            <>
                                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>⚙️ Page Settings</label>
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ display: 'block', marginBottom: '3px', fontSize: '11px' }}>Size:</label>
                                        <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} style={{ width: '100%', padding: '5px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}>
                                            <option value="A4">A4 (210×297mm)</option>
                                            <option value="A5">A5 (148×210mm)</option>
                                            <option value="A3">A3 (297×420mm)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '3px', fontSize: '11px' }}>Background:</label>
                                        <input type="color" value={pageBg} onChange={(e) => setPageBg(e.target.value)} style={{ width: '100%', height: '30px', border: '1px solid #ced4da', borderRadius: '3px' }} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>💾 Save / Load</label>
                                    <input type="text" placeholder="Template name..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} style={{ width: '100%', padding: '6px', marginBottom: '8px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }} />
                                    <button onClick={saveTemplate} style={{ width: '100%', padding: '8px', marginBottom: '8px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px', fontSize: '12px' }}>💾 Save Template</button>
                                    <select onChange={(e) => { const t = templates.find(tpl => tpl.id === parseInt(e.target.value)); if (t) { loadTemplate(t); setEditorStep('design'); } e.target.value = ''; }} style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}>
                                        <option value="">Load saved template...</option>
                                        {templates.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Rest of sidebar: when Select API or Sample JSON is chosen — for Design step */}
                        {(selectedApiName || selectedSampleJson) && (
                        <>

                        {/* Step 2: Design — full Add Elements (rows + content); only when in design mode */}
                        {editorStep === 'design' && (
                        <>
                        {/* Student Data Selector - Show when template has elements */}
                        {elements.length > 0 && data && data.data && data.data.student_list && (
                            <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                                    👤 Select Student Data
                                </label>
                                <select
                                    value={selectedStudentIndex}
                                    onChange={(e) => {
                                        setSelectedStudentIndex(parseInt(e.target.value));
                                        const studentData = data.data.student_list[parseInt(e.target.value)];
                                        if (studentData) {
                                            setPreviewData({
                                                ...data,
                                                data: {
                                                    ...data.data,
                                                    student_list: [studentData]
                                                }
                                            });
                                        }
                                    }}
                                    style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px', marginBottom: '8px' }}
                                >
                                    {data.data.student_list.map((student, index) => (
                                        <option key={index} value={index}>
                                            {student.student_name} ({student.current_reg_num})
                                        </option>
                                    ))}
                                </select>
                                {data.data.student_list[selectedStudentIndex] && (
                                    <div style={{ padding: '8px', backgroundColor: '#e7f3ff', borderRadius: '3px', fontSize: '11px' }}>
                                        <div><strong>Name:</strong> {data.data.student_list[selectedStudentIndex].student_name}</div>
                                        <div><strong>Reg No:</strong> {data.data.student_list[selectedStudentIndex].current_reg_num}</div>
                                        <div><strong>Grade:</strong> {data.data.student_list[selectedStudentIndex].grade}</div>
                                        <div><strong>Percentage:</strong> {data.data.student_list[selectedStudentIndex].total_summary?.percentage || 0}%</div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowPreview(true)}
                                    style={{
                                        width: '100%',
                                        marginTop: '8px',
                                        padding: '8px',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderRadius: '3px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    👁️ Preview Template
                                </button>
                            </div>
                        )}

                        {/* Predefined Templates */}
                        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                                🎨 Predefined Templates
                            </label>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        loadPredefinedTemplate(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}
                            >
                                <option value="">Choose a template...</option>
                                {Object.keys(predefinedTemplates).map(key => (
                                    <option key={key} value={key}>{predefinedTemplates[key].name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Add Elements — Design mode only */}
                        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                                ➕ Add Elements
                            </label>
                            {selectedElement && selectedElement.type === 'row' && (
                                <div style={{ marginBottom: '8px', padding: '6px', backgroundColor: '#e7d2ff', borderRadius: '3px', fontSize: '11px', color: '#6f42c1' }}>
                                    ✓ Row selected - Elements will be added to this row
                                </div>
                            )}
                            <div style={{ marginBottom: '8px' }}>
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        setSidebarDragType('row');
                                        e.dataTransfer.setData('application/x-element-type', 'row');
                                        e.dataTransfer.effectAllowed = 'copy';
                                        e.dataTransfer.setData('text/plain', 'row');
                                    }}
                                    onDragEnd={() => setSidebarDragType(null)}
                                    onClick={addRow}
                                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: '#6f42c1', color: 'white', border: 'none', cursor: 'grab', borderRadius: '3px', fontWeight: 'bold', textAlign: 'center', userSelect: 'none' }}
                                >
                                    📐 Create Row (for horizontal layout)
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                {[
                                    { type: 'label', label: '📝 Label', bg: '#28a745', color: 'white' },
                                    { type: 'value', label: '🔢 Value', bg: '#007bff', color: 'white' },
                                    { type: 'table', label: '📊 Table', bg: '#17a2b8', color: 'white' },
                                    { type: 'image', label: '🖼️ Image', bg: '#ffc107', color: 'black' },
                                    { type: 'shape', label: '◇ Shape', bg: '#6c757d', color: 'white' }
                                ].map(({ type, label, bg, color }) => (
                                    <div
                                        key={type}
                                        draggable
                                        onDragStart={(e) => {
                                            setSidebarDragType(type);
                                            e.dataTransfer.setData('application/x-element-type', type);
                                            e.dataTransfer.effectAllowed = 'copy';
                                            e.dataTransfer.setData('text/plain', type);
                                        }}
                                        onDragEnd={() => setSidebarDragType(null)}
                                        onClick={() => {
                                            const parentRowId = selectedElement && selectedElement.type === 'row' ? selectedElement.id : null;
                                            addElement(type, parentRowId);
                                        }}
                                        style={{ padding: '8px', fontSize: '12px', background: bg, color, border: 'none', cursor: 'grab', borderRadius: '3px', textAlign: 'center', userSelect: 'none' }}
                                    >
                                        {label}
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: '10px', color: '#6c757d', marginTop: '6px' }}>Click to add • or drag onto canvas</p>
                            {/* Add multiple */}
                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>➕ Add multiple</label>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select
                                        id="add-multi-type"
                                        style={{ padding: '4px 6px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px', minWidth: '70px' }}
                                    >
                                        <option value="label">Label</option>
                                        <option value="value">Value</option>
                                        <option value="table">Table</option>
                                        <option value="image">Image</option>
                                        <option value="shape">Shape</option>
                                    </select>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        defaultValue={2}
                                        id="add-multi-count"
                                        style={{ width: '44px', padding: '4px', fontSize: '11px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    />
                                    <button
                                        onClick={() => {
                                            const type = document.getElementById('add-multi-type')?.value || 'label';
                                            const count = document.getElementById('add-multi-count')?.value || 2;
                                            const parentRowId = selectedElement && selectedElement.type === 'row' ? selectedElement.id : null;
                                            addMultipleElements(type, count, parentRowId);
                                        }}
                                        style={{ padding: '4px 8px', fontSize: '11px', background: '#6f42c1', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                                    >
                                        Add N
                                    </button>
                                </div>
                            </div>
                        </div>

                        </>
                        )}

                        {/* Page Settings — both Layout and Design */}
                        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                                ⚙️ Page Settings
                            </label>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '11px' }}>Size:</label>
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(e.target.value)}
                                    style={{ width: '100%', padding: '5px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                >
                                    <option value="A4">A4 (210×297mm)</option>
                                    <option value="A5">A5 (148×210mm)</option>
                                    <option value="A3">A3 (297×420mm)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '11px' }}>Background:</label>
                                <input
                                    type="color"
                                    value={pageBg}
                                    onChange={(e) => setPageBg(e.target.value)}
                                    style={{ width: '100%', height: '30px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                />
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '3px', fontSize: '11px' }}>Background Image URL:</label>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={backgroundImageUrlInput}
                                        onChange={(e) => setBackgroundImageUrlInput(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                setPageBackgroundImage(backgroundImageUrlInput.trim());
                                            }
                                        }}
                                        style={{ flex: 1, padding: '5px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    />
                                    <button
                                        onClick={() => setPageBackgroundImage(backgroundImageUrlInput.trim())}
                                        style={{ padding: '5px 12px', fontSize: '11px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px', whiteSpace: 'nowrap' }}
                                        title="Apply background image"
                                    >
                                        Apply
                                    </button>
                                </div>
                                {pageBackgroundImage && (
                                    <div style={{ marginTop: '5px', fontSize: '10px', color: '#28a745' }}>
                                        ✓ Image applied
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save/Load */}
                        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                                💾 Save / Load
                            </label>
                            <input
                                type="text"
                                placeholder="Template name..."
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                style={{ width: '100%', padding: '6px', marginBottom: '8px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}
                            />
                            <button
                                onClick={saveTemplate}
                                style={{ width: '100%', padding: '8px', marginBottom: '8px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px', fontSize: '12px' }}
                            >
                                💾 Save Template
                            </button>
                            <select
                                onChange={(e) => {
                                    const template = templates.find(t => t.id === parseInt(e.target.value));
                                    if (template) loadTemplate(template);
                                    e.target.value = '';
                                }}
                                style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}
                            >
                                <option value="">Load saved template...</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        </>
                        )}
                    </div>
                )}

                {/* Canvas Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#e9ecef' }}>
                    {/* Canvas Toolbar */}
                    <div style={{ padding: '10px', backgroundColor: 'white', borderBottom: '1px solid #dee2e6', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Zoom:</span>
                        <button onClick={() => setZoom(Math.max(50, zoom - 10))} style={{ padding: '3px 8px', fontSize: '12px' }}>-</button>
                        <span style={{ minWidth: '50px', textAlign: 'center', fontSize: '12px' }}>{zoom}%</span>
                        <button onClick={() => setZoom(Math.min(200, zoom + 10))} style={{ padding: '3px 8px', fontSize: '12px' }}>+</button>
                        <span style={{ marginLeft: '20px', fontSize: '12px', fontWeight: 'bold' }}>Grid:</span>
                        <button
                            onClick={() => setShowGrid(!showGrid)}
                            style={{ padding: '3px 8px', fontSize: '12px', background: showGrid ? '#007bff' : '#6c757d', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                            {showGrid ? 'ON' : 'OFF'}
                        </button>
                        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#6c757d' }}>
                            {(() => {
                                const countElements = (els) => {
                                    let count = 0;
                                    els.forEach(el => {
                                        count++;
                                        if (el.type === 'row' && el.children) {
                                            count += countElements(el.children);
                                        }
                                    });
                                    return count;
                                };
                                return countElements(elements);
                            })()} element(s) | {pageSize} | {currentSize.width}×{currentSize.height}mm
                        </div>
                    </div>

                    {/* Canvas */}
                    <div style={{ flex: 1, padding: '20px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', position: 'relative' }}>
                        {editorStep === 'design' && !selectedApiName && !selectedSampleJson && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,236,239,0.85)', zIndex: 10, borderRadius: '4px' }}>
                                <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', maxWidth: '320px' }}>
                                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔌</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#495057', marginBottom: '6px' }}>Select API or Sample JSON to design</div>
                                    <div style={{ fontSize: '12px', color: '#6c757d' }}>In Design step, select an API or Sample JSON in the left sidebar to load data and add content elements.</div>
                                </div>
                            </div>
                        )}
                        <div
                            ref={canvasRef}
                            onDragOver={(e) => {
                                if (e.dataTransfer.types.includes('application/x-element-type') || e.dataTransfer.types.includes('text/plain')) {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const type = e.dataTransfer.getData('application/x-element-type') || e.dataTransfer.getData('text/plain');
                                if (type === 'row') {
                                    const idx = dropZoneHoverIndex !== null && dropZoneHoverIndex !== undefined ? dropZoneHoverIndex : elements.length;
                                    const newRow = {
                                        id: `el_${Date.now()}_${Math.random()}`,
                                        type: 'row',
                                        margin: 0,
                                        padding: 0,
                                        gap: 8,
                                        flexDirection: 'row',
                                        alignItems: 'stretch',
                                        justifyContent: 'flex-start',
                                        width: '100%',
                                        children: []
                                    };
                                    const next = [...elements];
                                    next.splice(Math.max(0, Math.min(idx, next.length)), 0, newRow);
                                    setElements(next);
                                    setSelectedElement(newRow);
                                } else if (type && ['label', 'value', 'table', 'image', 'shape'].includes(type)) {
                                    if (dropZoneHoverRowId) {
                                        addElement(type, dropZoneHoverRowId);
                                    } else {
                                        insertElementAt(type, dropZoneHoverIndex !== null && dropZoneHoverIndex !== undefined ? dropZoneHoverIndex : elements.length);
                                    }
                                }
                                setDropZoneHoverIndex(null);
                                setDropZoneHoverRowId(null);
                                setSidebarDragType(null);
                            }}
                            onDragLeave={() => {
                                setDropZoneHoverIndex(null);
                                setDropZoneHoverRowId(null);
                            }}
                            style={{
                                width: `${currentSize.width * zoomFactor}mm`,
                                minHeight: `${currentSize.height * zoomFactor}mm`,
                                backgroundColor: pageBg,
                                border: '2px solid #333',
                                overflow: 'hidden',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                backgroundImage: pageBackgroundImage
                                    ? `url("${pageBackgroundImage.replace(/"/g, '%22')}")${showGrid ? `, linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)` : ''}`
                                    : (showGrid ? `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)` : 'none'),
                                backgroundSize: pageBackgroundImage
                                    ? (showGrid ? `cover, ${20 * zoomFactor}px ${20 * zoomFactor}px, ${20 * zoomFactor}px ${20 * zoomFactor}px` : 'cover')
                                    : (showGrid ? `${20 * zoomFactor}px ${20 * zoomFactor}px` : 'auto'),
                                backgroundPosition: pageBackgroundImage ? 'center, 0 0, 0 0' : '0 0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: typeof rootLayout.gap === 'number' ? `${rootLayout.gap}px` : (rootLayout.gap || '8px'),
                                padding: boxSpacingToCss(rootLayout.padding),
                                margin: boxSpacingToCss(rootLayout.margin),
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Drop zone before first element - visible when dragging from sidebar */}
                            {(dropIndicatorIndex === 0 || sidebarDragType) && (
                                <div
                                    key="drop-0"
                                    data-drop-index={0}
                                    onDragEnter={(ev) => { ev.stopPropagation(); setDropZoneHoverIndex(0); setDropZoneHoverRowId(null); }}
                                    onDragLeave={(ev) => { ev.stopPropagation(); setDropZoneHoverIndex(prev => (prev === 0 ? null : prev)); }}
                                    style={{
                                        height: sidebarDragType && dropZoneHoverIndex === 0 ? '28px' : '12px',
                                        minHeight: sidebarDragType ? '12px' : '4px',
                                        borderTop: `2px solid ${dropZoneHoverIndex === 0 && sidebarDragType ? '#28a745' : '#007bff'}`,
                                        margin: '2px 0',
                                        flexShrink: 0,
                                        borderRadius: '4px',
                                        backgroundColor: dropZoneHoverIndex === 0 && sidebarDragType ? 'rgba(40,167,69,0.35)' : 'rgba(0,123,255,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        color: dropZoneHoverIndex === 0 && sidebarDragType ? '#155724' : '#007bff',
                                        transition: 'height 0.15s, background-color 0.15s'
                                    }}
                                >
                                    {sidebarDragType && dropZoneHoverIndex === 0 ? '↓ Drop here' : null}
                                </div>
                            )}
                            {elements.map((element, i) => {
                                const renderElementWithRow = (el, idx, isInRow = false) => {
                                    const isSelected = selectedElement && selectedElement.id === el.id;
                                    const isDragging = draggingElement === el.id;
                                    const marginCss = boxSpacingToCss(el.margin ?? 0);
                                    const paddingCss = boxSpacingToCss(el.padding ?? 5);
                                    const widthVal = el.width != null ? (typeof el.width === 'number' ? `${el.width}px` : el.width) : 'auto';
                                    const heightVal = el.height != null ? (typeof el.height === 'number' ? `${el.height}px` : el.height) : 'auto';
                                    const hasExplicitWidth = el.width != null;
                                    const hasExplicitHeight = el.height != null;
                                    
                                    if (el.type === 'row') {
                                        const isDropTarget = sidebarDragType && dropZoneHoverRowId === el.id;
                                        return (
                                            <div
                                                key={el.id}
                                                data-element-id={el.id}
                                                data-drop-row={el.id}
                                                onDragEnter={(e) => { e.stopPropagation(); if (sidebarDragType) { setDropZoneHoverRowId(el.id); setDropZoneHoverIndex(null); } }}
                                                onDragLeave={(e) => { e.stopPropagation(); setDropZoneHoverRowId(null); }}
                                                onClick={(e) => { e.stopPropagation(); if (selectedApiName || selectedSampleJson) setSelectedElement(el); }}
                                                onMouseDown={(e) => handleMouseDown(e, el)}
                                                style={{
                                                    margin: marginCss,
                                                    padding: paddingCss,
                                                    width: widthVal,
                                                    border: isDropTarget ? '2px solid #28a745' : (isSelected ? '2px solid #6f42c1' : '1px dashed #999'),
                                                    backgroundColor: isDropTarget ? 'rgba(40,167,69,0.15)' : (isDragging ? 'rgba(111,66,193,0.15)' : (isSelected ? 'rgba(111,66,193,0.1)' : 'rgba(255,255,255,0.95)')),
                                                    cursor: isDragging ? 'grabbing' : 'grab',
                                                    boxShadow: isDropTarget ? '0 0 10px rgba(40,167,69,0.5)' : (isSelected ? '0 0 10px rgba(111,66,193,0.5)' : (isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none')),
                                                    position: 'relative',
                                                    boxSizing: 'border-box',
                                                    display: 'flex',
                                                    flexDirection: el.flexDirection || 'row',
                                                    gap: typeof el.gap === 'number' ? `${el.gap}px` : (el.gap || '8px'),
                                                    alignItems: el.alignItems || 'stretch',
                                                    justifyContent: el.justifyContent || 'flex-start',
                                                    opacity: isDragging ? 0.9 : 1
                                                }}
                                            >
                                                {el.children && el.children.length > 0 ? (
                                                    el.children.map((child, childIdx) => renderElementWithRow(child, childIdx, true))
                                                ) : (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px', flex: 1 }}>
                                                        Empty row - Add elements here
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <>
                                                        <div style={{ position: 'absolute', top: '-20px', left: 0, background: '#6f42c1', color: 'white', padding: '2px 6px', fontSize: '10px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                                                            ROW ({el.children?.length || 0} items)
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                                                            style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc3545', color: 'white', border: '2px solid white', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1', zIndex: 1001 }}
                                                        >
                                                            ×
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    }
                                    
                                    return (
                                        <div
                                            key={el.id}
                                            data-element-id={el.id}
                                            onClick={(e) => { 
                                                // Don't select if clicking on resize handles or delete button
                                                if (e.target.closest('[data-resize-handle]') || e.target.closest('button')) {
                                                    return;
                                                }
                                                e.stopPropagation(); 
                                                if (selectedApiName || selectedSampleJson) setSelectedElement(el); 
                                            }}
                                            onMouseDown={(e) => {
                                                // Don't trigger drag if clicking on resize handles
                                                if (e.target.closest('[data-resize-handle]')) {
                                                    return;
                                                }
                                                handleMouseDown(e, el);
                                            }}
                                            style={{
                                                margin: marginCss,
                                                padding: paddingCss,
                                                width: widthVal,
                                                minWidth: widthVal === 'auto' ? undefined : widthVal,
                                                height: heightVal,
                                                border: isSelected ? '2px solid #007bff' : '1px dashed #999',
                                                backgroundColor: isDragging ? 'rgba(0,123,255,0.15)' : (isSelected ? 'rgba(0,123,255,0.1)' : 'rgba(255,255,255,0.95)'),
                                                cursor: isDragging ? 'grabbing' : (isSelected ? 'default' : 'grab'),
                                                boxShadow: isSelected ? '0 0 10px rgba(0,123,255,0.5)' : (isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'),
                                                position: 'relative',
                                                boxSizing: 'border-box',
                                                overflow: isSelected ? 'visible' : 'hidden',
                                                opacity: isDragging ? 0.9 : 1,
                                                flex: isInRow ? (hasExplicitWidth ? `0 0 ${widthVal}` : '1 1 auto') : undefined,
                                                minWidth: isInRow && hasExplicitWidth ? widthVal : (widthVal === 'auto' ? undefined : widthVal),
                                                maxWidth: isInRow && hasExplicitWidth ? widthVal : undefined
                                            }}
                                        >
                                            <div style={{ width: '100%', height: '100%', overflow: 'hidden', pointerEvents: resizingElement === el.id ? 'none' : 'auto' }}>
                                                {renderElement(el)}
                                            </div>
                                            {isSelected && (
                                                <>
                                                    <div style={{ position: 'absolute', top: '-20px', left: 0, background: '#007bff', color: 'white', padding: '2px 6px', fontSize: '10px', borderRadius: '3px', whiteSpace: 'nowrap', zIndex: 1002, pointerEvents: 'none' }}>
                                                        {el.type.toUpperCase()} ({el.width ?? '—'}×{el.height ?? '—'})
                                                    </div>
                                                    {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(handle => (
                                                        <div
                                                            key={handle}
                                                            data-resize-handle="true"
                                                            onMouseDown={(e) => { 
                                                                e.stopPropagation(); 
                                                                e.preventDefault(); 
                                                                setResizingElement(el.id); 
                                                                setResizeHandle(handle); 
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#0056b3'; e.currentTarget.style.transform = 'scale(1.2)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#007bff'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                            style={{
                                                                position: 'absolute', 
                                                                width: '12px', 
                                                                height: '12px', 
                                                                background: '#007bff', 
                                                                border: '2px solid white', 
                                                                cursor: `${handle}-resize`,
                                                                zIndex: 1002,
                                                                borderRadius: '2px',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                                pointerEvents: 'auto',
                                                                transition: 'background 0.2s, transform 0.2s',
                                                                ...(handle.includes('n') && { top: '-6px' }), 
                                                                ...(handle.includes('s') && { bottom: '-6px' }),
                                                                ...(handle.includes('w') && { left: '-6px' }), 
                                                                ...(handle.includes('e') && { right: '-6px' }),
                                                                ...(handle === 'nw' && { top: '-6px', left: '-6px' }), 
                                                                ...(handle === 'ne' && { top: '-6px', right: '-6px' }),
                                                                ...(handle === 'sw' && { bottom: '-6px', left: '-6px' }), 
                                                                ...(handle === 'se' && { bottom: '-6px', right: '-6px' })
                                                            }}
                                                        />
                                                    ))}
                                                </>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                                                style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc3545', color: 'white', border: '2px solid white', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1', zIndex: 1001 }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                };
                                
                                const dropIdx = i + 1;
                                const showZone = dropIndicatorIndex === dropIdx || sidebarDragType;
                                const isHover = dropZoneHoverIndex === dropIdx && sidebarDragType;
                                return (
                                    <React.Fragment key={element.id}>
                                        {showZone && (
                                            <div
                                                key={`drop-${dropIdx}`}
                                                data-drop-index={dropIdx}
                                                onDragEnter={(ev) => { ev.stopPropagation(); setDropZoneHoverIndex(dropIdx); setDropZoneHoverRowId(null); }}
                                                onDragLeave={(ev) => { ev.stopPropagation(); setDropZoneHoverIndex(prev => (prev === dropIdx ? null : prev)); }}
                                                style={{
                                                    height: isHover ? '28px' : '12px',
                                                    minHeight: sidebarDragType ? '12px' : '4px',
                                                    borderTop: `2px solid ${isHover ? '#28a745' : '#007bff'}`,
                                                    margin: '2px 0',
                                                    flexShrink: 0,
                                                    borderRadius: '4px',
                                                    backgroundColor: isHover ? 'rgba(40,167,69,0.35)' : 'rgba(0,123,255,0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    color: isHover ? '#155724' : '#007bff',
                                                    transition: 'height 0.15s, background-color 0.15s'
                                                }}
                                            >
                                                {isHover ? '↓ Drop here' : null}
                                            </div>
                                        )}
                                        {renderElementWithRow(element, i)}
                                    </React.Fragment>
                                );
                            })}
                            {elements.length > 0 && (dropIndicatorIndex === elements.length || sidebarDragType) && (
                                <div
                                    key={`drop-${elements.length}`}
                                    data-drop-index={elements.length}
                                    onDragEnter={(ev) => { ev.stopPropagation(); setDropZoneHoverIndex(elements.length); setDropZoneHoverRowId(null); }}
                                    onDragLeave={(ev) => { ev.stopPropagation(); setDropZoneHoverIndex(prev => (prev === elements.length ? null : prev)); }}
                                    style={{
                                        height: dropZoneHoverIndex === elements.length && sidebarDragType ? '28px' : '12px',
                                        minHeight: sidebarDragType ? '12px' : '4px',
                                        borderTop: `2px solid ${dropZoneHoverIndex === elements.length && sidebarDragType ? '#28a745' : '#007bff'}`,
                                        margin: '2px 0',
                                        flexShrink: 0,
                                        borderRadius: '4px',
                                        backgroundColor: dropZoneHoverIndex === elements.length && sidebarDragType ? 'rgba(40,167,69,0.35)' : 'rgba(0,123,255,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        color: dropZoneHoverIndex === elements.length && sidebarDragType ? '#155724' : '#007bff',
                                        transition: 'height 0.15s, background-color 0.15s'
                                    }}
                                >
                                    {dropZoneHoverIndex === elements.length && sidebarDragType ? '↓ Drop here' : null}
                                </div>
                            )}
                            {elements.length === 0 && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', textAlign: 'center', color: '#999' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
                                    <p>Click "Add Elements" to start designing</p>
                                    <p style={{ fontSize: '12px', marginTop: '5px' }}>Drag to reorder • Margin controls spacing</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Properties Panel */}
                {selectedElement && (
                    <div style={{
                        width: '300px',
                        backgroundColor: '#f8f9fa',
                        padding: '15px',
                        overflowY: 'auto',
                        borderLeft: '1px solid #dee2e6'
                    }}>
                        <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #007bff' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#007bff' }}>
                                ⚙️ Element Properties
                            </h3>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '3px' }}>
                                {selectedElement.type.toUpperCase()}
                            </div>
                        </div>

                        {/* Margin & Size — position by drag-and-drop + margin only */}
                        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>📍 Margin & Size</label>
                            <p style={{ fontSize: '10px', color: '#6c757d', marginBottom: '8px' }}>Drag to reorder. Margin controls spacing.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Margin Top:</label>
                                    <input
                                        type="number"
                                        value={typeof selectedElement.margin === 'object' && selectedElement.margin?.top != null ? selectedElement.margin.top : (typeof selectedElement.margin === 'number' ? selectedElement.margin : 0)}
                                        onChange={(e) => { const m = typeof selectedElement.margin === 'object' && selectedElement.margin ? selectedElement.margin : { top: 0, left: 0 }; updateElement(selectedElement.id, { margin: { ...m, top: parseInt(e.target.value) || 0 } }); }}
                                        style={{ width: '100%', padding: '4px', fontSize: '11px', textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Margin Left:</label>
                                    <input
                                        type="number"
                                        value={typeof selectedElement.margin === 'object' && selectedElement.margin?.left != null ? selectedElement.margin.left : (typeof selectedElement.margin === 'number' ? selectedElement.margin : 0)}
                                        onChange={(e) => { const m = typeof selectedElement.margin === 'object' && selectedElement.margin ? selectedElement.margin : { top: 0, left: 0 }; updateElement(selectedElement.id, { margin: { ...m, left: parseInt(e.target.value) || 0 } }); }}
                                        style={{ width: '100%', padding: '4px', fontSize: '11px', textAlign: 'center' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Width:</label>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <button onClick={() => updateElement(selectedElement.id, { width: Math.max(50, (selectedElement.width || 100) - 10) })} style={{ padding: '2px 6px', fontSize: '10px' }}>-</button>
                                        <input type="number" value={selectedElement.width ?? ''} onChange={(e) => updateElement(selectedElement.id, { width: e.target.value === '' ? undefined : parseInt(e.target.value) || 50 })} style={{ flex: 1, padding: '4px', fontSize: '11px', textAlign: 'center' }} placeholder="auto" />
                                        <button onClick={() => updateElement(selectedElement.id, { width: (selectedElement.width || 100) + 10 })} style={{ padding: '2px 6px', fontSize: '10px' }}>+</button>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Height:</label>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        <button onClick={() => updateElement(selectedElement.id, { height: Math.max(30, (selectedElement.height || 30) - 10) })} style={{ padding: '2px 6px', fontSize: '10px' }}>-</button>
                                        <input type="number" value={selectedElement.height ?? ''} onChange={(e) => updateElement(selectedElement.id, { height: e.target.value === '' ? undefined : parseInt(e.target.value) || 30 })} style={{ flex: 1, padding: '4px', fontSize: '11px', textAlign: 'center' }} placeholder="auto" />
                                        <button onClick={() => updateElement(selectedElement.id, { height: (selectedElement.height || 30) + 10 })} style={{ padding: '2px 6px', fontSize: '10px' }}>+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Text Properties */}
                        {(selectedElement.type === 'label' || selectedElement.type === 'value') && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>✏️ Text Properties</label>
                                {selectedElement.type === 'label' && (
                                    <input
                                        type="text"
                                        value={selectedElement.text || ''}
                                        onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                                        placeholder="Label text..."
                                        style={{ width: '100%', padding: '6px', marginBottom: '8px', fontSize: '12px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    />
                                )}
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Font Size:</label>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                        <button onClick={() => updateElement(selectedElement.id, { fontSize: Math.max(8, selectedElement.fontSize - 1) })} style={{ padding: '4px 8px', fontSize: '12px' }}>-</button>
                                        <input
                                            type="number"
                                            value={selectedElement.fontSize || 14}
                                            onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 14 })}
                                            style={{ flex: 1, padding: '6px', fontSize: '12px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '3px' }}
                                            min="8"
                                            max="72"
                                        />
                                        <button onClick={() => updateElement(selectedElement.id, { fontSize: Math.min(72, (selectedElement.fontSize || 14) + 1) })} style={{ padding: '4px 8px', fontSize: '12px' }}>+</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Font Family:</label>
                                        <select
                                            value={selectedElement.fontFamily || 'Arial, sans-serif'}
                                            onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                                            style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        >
                                            <option value="Arial, sans-serif">Arial</option>
                                            <option value="'Times New Roman', serif">Times New Roman</option>
                                            <option value="'Courier New', monospace">Courier New</option>
                                            <option value="Georgia, serif">Georgia</option>
                                            <option value="Verdana, sans-serif">Verdana</option>
                                            <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                            <option value="Impact, sans-serif">Impact</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Text Color:</label>
                                        <input
                                            type="color"
                                            value={selectedElement.color || '#000000'}
                                            onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                            style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Weight:</label>
                                        <select
                                            value={selectedElement.fontWeight || 'normal'}
                                            onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })}
                                            style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="bold">Bold</option>
                                            <option value="lighter">Light</option>
                                            <option value="bolder">Bolder</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Style:</label>
                                        <select
                                            value={selectedElement.fontStyle || 'normal'}
                                            onChange={(e) => updateElement(selectedElement.id, { fontStyle: e.target.value })}
                                            style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="italic">Italic</option>
                                            <option value="oblique">Oblique</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Decoration:</label>
                                        <select
                                            value={selectedElement.textDecoration || 'none'}
                                            onChange={(e) => updateElement(selectedElement.id, { textDecoration: e.target.value })}
                                            style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        >
                                            <option value="none">None</option>
                                            <option value="underline">Underline</option>
                                            <option value="overline">Overline</option>
                                            <option value="line-through">Strikethrough</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Align:</label>
                                        <select
                                            value={selectedElement.textAlign || 'left'}
                                            onChange={(e) => updateElement(selectedElement.id, { textAlign: e.target.value })}
                                            style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        >
                                            <option value="left">Left</option>
                                            <option value="center">Center</option>
                                            <option value="right">Right</option>
                                            <option value="justify">Justify</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Image: add image manually (URL) */}
                        {selectedElement.type === 'image' && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>🖼️ Add image manually</label>
                                <input
                                    type="text"
                                    value={selectedElement.imageUrl || ''}
                                    onChange={(e) => updateElement(selectedElement.id, { imageUrl: e.target.value })}
                                    placeholder="Paste image URL (e.g. https://... or data:image/...)"
                                    style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px', boxSizing: 'border-box' }}
                                />
                                <p style={{ marginTop: '4px', fontSize: '10px', color: '#6c757d' }}>Use this URL for the image, or select a field from Data Path below to use API data.</p>
                            </div>
                        )}

                        {/* Shape: kind, fill, stroke */}
                        {selectedElement.type === 'shape' && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>◇ Shape</label>
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Kind:</label>
                                    <select
                                        value={selectedElement.shapeKind || 'rect'}
                                        onChange={(e) => updateElement(selectedElement.id, { shapeKind: e.target.value })}
                                        style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    >
                                        <option value="rect">Rectangle</option>
                                        <option value="circle">Circle</option>
                                        <option value="ellipse">Ellipse</option>
                                        <option value="line">Line</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Fill:</label>
                                        <input
                                            type="color"
                                            value={selectedElement.backgroundColor || '#e0e0e0'}
                                            onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })}
                                            style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Border color:</label>
                                        <input
                                            type="color"
                                            value={selectedElement.borderColor || '#000000'}
                                            onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })}
                                            style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Border width (px):</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={selectedElement.borderWidth ?? 1}
                                        onChange={(e) => updateElement(selectedElement.id, { borderWidth: parseInt(e.target.value) || 0 })}
                                        style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    />
                                </div>
                                {(selectedElement.shapeKind || 'rect') === 'rect' && (
                                    <div style={{ marginTop: '8px' }}>
                                        <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Corner radius (px):</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={selectedElement.borderRadius ?? 0}
                                            onChange={(e) => updateElement(selectedElement.id, { borderRadius: parseInt(e.target.value) || 0 })}
                                            style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Data Path — from Select API or Sample JSON template_data; either is enough to map */}
                        {(selectedApiName || selectedSampleJson) && (selectedElement.type === 'value' || selectedElement.type === 'table' || selectedElement.type === 'image') && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>🔗 Data Path</label>
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '4px', color: '#6c757d' }}>Select field (from Select API or Sample JSON)</label>
                                    <select
                                        value={selectedElement.dataPath || ''}
                                        onChange={(e) => {
                                            const newPath = e.target.value;
                                            updateElement(selectedElement.id, { dataPath: newPath });
                                            if (selectedElement.type === 'table' && newPath) {
                                                const tableData = getValue(newPath);
                                                if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                                                    const allColumns = Object.keys(tableData[0]);
                                                    updateElement(selectedElement.id, { selectedColumns: allColumns, dataPath: newPath });
                                                }
                                            }
                                        }}
                                        disabled={apiResponseLoading || sampleJsonLoading}
                                        style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    >
                                        <option value="">— Select field —</option>
                                        {effectiveMappingDataList.map((item, idx) => {
                                            const path = item.value != null ? item.value : item.path;
                                            const label = item.label != null ? item.label : item.name || path || `Field ${idx + 1}`;
                                            if (path == null) return null;
                                            return <option key={idx} value={path}>{label}</option>;
                                        })}
                                    </select>
                                    {(apiResponseLoading || sampleJsonLoading) && <span style={{ fontSize: '10px', color: '#6c757d', marginLeft: '4px' }}>Loading...</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                    <input
                                        type="text"
                                        value={selectedElement.dataPath || ''}
                                        onChange={(e) => {
                                            const newPath = e.target.value;
                                            updateElement(selectedElement.id, { dataPath: newPath });
                                            if (selectedElement.type === 'table' && newPath) {
                                                const tableData = getValue(newPath);
                                                if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                                                    const allColumns = Object.keys(tableData[0]);
                                                    updateElement(selectedElement.id, { selectedColumns: allColumns, dataPath: newPath });
                                                }
                                            }
                                        }}
                                        placeholder="e.g., data.student_list.0.student_name"
                                        style={{ flex: 1, padding: '6px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    />
                                    <button
                                        onClick={() => {
                                            setFieldMapperTarget(selectedElement);
                                            setShowFieldMapper(true);
                                        }}
                                        style={{ padding: '6px 10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px', fontSize: '12px' }}
                                        title="Browse JSON"
                                    >
                                        📁
                                    </button>
                                </div>
                                {selectedElement.dataPath && (
                                    <div style={{ padding: '5px', backgroundColor: '#f8f9fa', borderRadius: '3px', fontSize: '10px', color: '#6c757d' }}>
                                        Preview: {selectedElement.dataPath ? String(getValue(selectedElement.dataPath)).substring(0, 50) : 'No data'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Table Properties */}
                        {selectedElement.type === 'table' && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>📊 Table Properties</label>

                                {/* Column Selection */}
                                {selectedElement.dataPath && getValue(selectedElement.dataPath) && Array.isArray(getValue(selectedElement.dataPath)) && getValue(selectedElement.dataPath).length > 0 && (
                                    <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                                            📋 Select Columns to Display:
                                        </label>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '3px', padding: '8px', backgroundColor: 'white' }}>
                                            {Object.keys(getValue(selectedElement.dataPath)[0]).map(column => {
                                                const allColumns = Object.keys(getValue(selectedElement.dataPath)[0]);
                                                const isSelected = selectedElement.selectedColumns?.includes(column) ?? (selectedElement.selectedColumns?.length === 0 ? true : false);

                                                return (
                                                    <div key={column} style={{ marginBottom: '8px', padding: '6px', backgroundColor: isSelected ? '#e7f3ff' : '#f8f9fa', borderRadius: '3px', border: `1px solid ${isSelected ? '#007bff' : '#dee2e6'}` }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', marginBottom: '4px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    const currentColumns = selectedElement.selectedColumns && selectedElement.selectedColumns.length > 0
                                                                        ? selectedElement.selectedColumns
                                                                        : allColumns;
                                                                    const newColumns = e.target.checked
                                                                        ? [...currentColumns.filter(c => c !== column), column]
                                                                        : currentColumns.filter(c => c !== column);
                                                                    updateElement(selectedElement.id, { selectedColumns: newColumns.length > 0 ? newColumns : allColumns });
                                                                }}
                                                                style={{ marginRight: '6px', cursor: 'pointer' }}
                                                            />
                                                            <span style={{ fontWeight: isSelected ? 'bold' : 'normal', flex: 1 }}>{column}</span>
                                                        </label>
                                                        {/* Custom Header Label */}
                                                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontSize: '9px', color: '#6c757d', minWidth: '60px' }}>Label:</span>
                                                            <input
                                                                type="text"
                                                                placeholder={`Custom label for ${column}...`}
                                                                value={selectedElement.columnHeaders?.[column] || ''}
                                                                onChange={(e) => {
                                                                    const newHeaders = {
                                                                        ...(selectedElement.columnHeaders || {}),
                                                                        [column]: e.target.value
                                                                    };
                                                                    if (!e.target.value) {
                                                                        delete newHeaders[column];
                                                                    }
                                                                    updateElement(selectedElement.id, { columnHeaders: newHeaders });
                                                                }}
                                                                style={{ flex: 1, padding: '3px 6px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        {/* Show sample value */}
                                                        <div style={{ marginTop: '4px', fontSize: '9px', color: '#6c757d', fontStyle: 'italic' }}>
                                                            Sample: {String(getValue(selectedElement.dataPath)[0][column] || '').substring(0, 30)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '10px', color: '#6c757d' }}>
                                                {selectedElement.selectedColumns?.length || Object.keys(getValue(selectedElement.dataPath)[0]).length} of {Object.keys(getValue(selectedElement.dataPath)[0]).length} selected
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const allColumns = Object.keys(getValue(selectedElement.dataPath)[0]);
                                                    updateElement(selectedElement.id, { selectedColumns: allColumns });
                                                }}
                                                style={{ padding: '3px 8px', fontSize: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px' }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                onClick={() => {
                                                    updateElement(selectedElement.id, { selectedColumns: [] });
                                                }}
                                                style={{ padding: '3px 8px', fontSize: '10px', background: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '3px', marginLeft: '4px' }}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {(!selectedElement.dataPath || !getValue(selectedElement.dataPath) || !Array.isArray(getValue(selectedElement.dataPath))) && (
                                    <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '3px', border: '1px solid #ffc107', fontSize: '11px', color: '#856404' }}>
                                        ⚠️ Set a data path first to select columns
                                    </div>
                                )}

                                {/* Top Header Row (like "CONSOLIDATED MARKS") */}
                                <div style={{ marginBottom: '15px', padding: '8px', backgroundColor: '#e7f3ff', borderRadius: '3px', border: '1px solid #b3d9ff' }}>
                                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#004085' }}>🏷️ Top Header Row</label>
                                    <div style={{ marginBottom: '5px' }}>
                                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Enable Top Header:</label>
                                        <input
                                            type="checkbox"
                                            checked={selectedElement.topHeaderRow?.enabled || false}
                                            onChange={(e) => {
                                                const topHeaderRow = {
                                                    ...(selectedElement.topHeaderRow || {}),
                                                    enabled: e.target.checked,
                                                    text: selectedElement.topHeaderRow?.text || 'CONSOLIDATED MARKS',
                                                    backgroundColor: selectedElement.topHeaderRow?.backgroundColor || '#1e3a8a',
                                                    color: selectedElement.topHeaderRow?.color || '#ffffff',
                                                    fontSize: selectedElement.topHeaderRow?.fontSize || 16,
                                                    fontWeight: selectedElement.topHeaderRow?.fontWeight || 'bold',
                                                    borderRadius: selectedElement.topHeaderRow?.borderRadius || 8
                                                };
                                                updateElement(selectedElement.id, { topHeaderRow });
                                            }}
                                            style={{ marginRight: '5px' }}
                                        />
                                        <span style={{ fontSize: '10px' }}>Show top header row</span>
                                    </div>
                                    {selectedElement.topHeaderRow?.enabled && (
                                        <>
                                            <div style={{ marginBottom: '5px' }}>
                                                <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Text:</label>
                                                <input
                                                    type="text"
                                                    value={selectedElement.topHeaderRow?.text || 'CONSOLIDATED MARKS'}
                                                    onChange={(e) => {
                                                        const topHeaderRow = { ...(selectedElement.topHeaderRow || {}), text: e.target.value };
                                                        updateElement(selectedElement.id, { topHeaderRow });
                                                    }}
                                                    style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                                                <div>
                                                    <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Background:</label>
                                                    <input
                                                        type="color"
                                                        value={selectedElement.topHeaderRow?.backgroundColor || '#1e3a8a'}
                                                        onChange={(e) => {
                                                            const topHeaderRow = { ...(selectedElement.topHeaderRow || {}), backgroundColor: e.target.value };
                                                            updateElement(selectedElement.id, { topHeaderRow });
                                                        }}
                                                        style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Text Color:</label>
                                                    <input
                                                        type="color"
                                                        value={selectedElement.topHeaderRow?.color || '#ffffff'}
                                                        onChange={(e) => {
                                                            const topHeaderRow = { ...(selectedElement.topHeaderRow || {}), color: e.target.value };
                                                            updateElement(selectedElement.id, { topHeaderRow });
                                                        }}
                                                        style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                                <div>
                                                    <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Font Size:</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.topHeaderRow?.fontSize || 16}
                                                        onChange={(e) => {
                                                            const topHeaderRow = { ...(selectedElement.topHeaderRow || {}), fontSize: parseInt(e.target.value) || 16 };
                                                            updateElement(selectedElement.id, { topHeaderRow });
                                                        }}
                                                        style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                        min="10"
                                                        max="24"
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Top Radius:</label>
                                                    <input
                                                        type="number"
                                                        value={selectedElement.topHeaderRow?.borderRadius || 8}
                                                        onChange={(e) => {
                                                            const topHeaderRow = { ...(selectedElement.topHeaderRow || {}), borderRadius: parseInt(e.target.value) || 0 };
                                                            updateElement(selectedElement.id, { topHeaderRow });
                                                        }}
                                                        style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                        min="0"
                                                        max="20"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Per-Column Styling */}
                                {selectedElement.dataPath && getValue(selectedElement.dataPath) && Array.isArray(getValue(selectedElement.dataPath)) && getValue(selectedElement.dataPath).length > 0 && (
                                    <div style={{ marginBottom: '15px', padding: '8px', backgroundColor: '#fff9e6', borderRadius: '3px', border: '1px solid #ffd700' }}>
                                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#856404' }}>🎨 Per-Column Styling</label>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {(() => {
                                                const allColumns = Object.keys(getValue(selectedElement.dataPath)[0]);
                                                const headers = selectedElement.selectedColumns && selectedElement.selectedColumns.length > 0
                                                    ? selectedElement.selectedColumns.filter(col => allColumns.includes(col))
                                                    : allColumns;
                                                return headers.map((col, idx) => {
                                                    const colStyles = selectedElement.columnStyles?.[col] || {};
                                                    const isFirst = idx === 0;
                                                    const isLast = idx === headers.length - 1;
                                                    return (
                                                        <div key={col} style={{ marginBottom: '10px', padding: '6px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                                            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#495057' }}>
                                                                {col} {isFirst && '(First)'} {isLast && '(Last)'}
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '8px', display: 'block', marginBottom: '1px' }}>TH BG:</label>
                                                                    <input
                                                                        type="color"
                                                                        value={colStyles.thBackgroundColor || selectedElement.thCss?.backgroundColor || '#f0f0f0'}
                                                                        onChange={(e) => {
                                                                            const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, thBackgroundColor: e.target.value } };
                                                                            updateElement(selectedElement.id, { columnStyles });
                                                                        }}
                                                                        style={{ width: '100%', height: '24px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '8px', display: 'block', marginBottom: '1px' }}>TD BG:</label>
                                                                    <input
                                                                        type="color"
                                                                        value={colStyles.tdBackgroundColor || '#ffffff'}
                                                                        onChange={(e) => {
                                                                            const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, tdBackgroundColor: e.target.value } };
                                                                            updateElement(selectedElement.id, { columnStyles });
                                                                        }}
                                                                        style={{ width: '100%', height: '24px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '8px', display: 'block', marginBottom: '1px' }}>TH Align:</label>
                                                                    <select
                                                                        value={colStyles.thTextAlign || 'center'}
                                                                        onChange={(e) => {
                                                                            const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, thTextAlign: e.target.value } };
                                                                            updateElement(selectedElement.id, { columnStyles });
                                                                        }}
                                                                        style={{ width: '100%', padding: '2px', fontSize: '9px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                    >
                                                                        <option value="left">Left</option>
                                                                        <option value="center">Center</option>
                                                                        <option value="right">Right</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '8px', display: 'block', marginBottom: '1px' }}>TD Align:</label>
                                                                    <select
                                                                        value={colStyles.tdTextAlign || (isFirst ? 'left' : 'center')}
                                                                        onChange={(e) => {
                                                                            const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, tdTextAlign: e.target.value } };
                                                                            updateElement(selectedElement.id, { columnStyles });
                                                                        }}
                                                                        style={{ width: '100%', padding: '2px', fontSize: '9px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                    >
                                                                        <option value="left">Left</option>
                                                                        <option value="center">Center</option>
                                                                        <option value="right">Right</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            {(isFirst || isLast) && (
                                                                <div>
                                                                    <label style={{ fontSize: '8px', display: 'block', marginBottom: '1px' }}>Border Radius (px):</label>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                                                        {isFirst && (
                                                                            <input
                                                                                type="number"
                                                                                placeholder="Top-Left"
                                                                                value={colStyles.borderRadiusTopLeft || 0}
                                                                                onChange={(e) => {
                                                                                    const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, borderRadiusTopLeft: parseInt(e.target.value) || 0 } };
                                                                                    updateElement(selectedElement.id, { columnStyles });
                                                                                }}
                                                                                style={{ width: '100%', padding: '2px', fontSize: '9px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                                min="0"
                                                                                max="20"
                                                                            />
                                                                        )}
                                                                        {isFirst && (
                                                                            <input
                                                                                type="number"
                                                                                placeholder="Bottom-Left"
                                                                                value={colStyles.borderRadiusBottomLeft || 0}
                                                                                onChange={(e) => {
                                                                                    const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, borderRadiusBottomLeft: parseInt(e.target.value) || 0 } };
                                                                                    updateElement(selectedElement.id, { columnStyles });
                                                                                }}
                                                                                style={{ width: '100%', padding: '2px', fontSize: '9px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                                min="0"
                                                                                max="20"
                                                                            />
                                                                        )}
                                                                        {isLast && (
                                                                            <input
                                                                                type="number"
                                                                                placeholder="Top-Right"
                                                                                value={colStyles.borderRadiusTopRight || 0}
                                                                                onChange={(e) => {
                                                                                    const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, borderRadiusTopRight: parseInt(e.target.value) || 0 } };
                                                                                    updateElement(selectedElement.id, { columnStyles });
                                                                                }}
                                                                                style={{ width: '100%', padding: '2px', fontSize: '9px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                                min="0"
                                                                                max="20"
                                                                            />
                                                                        )}
                                                                        {isLast && (
                                                                            <input
                                                                                type="number"
                                                                                placeholder="Bottom-Right"
                                                                                value={colStyles.borderRadiusBottomRight || 0}
                                                                                onChange={(e) => {
                                                                                    const columnStyles = { ...(selectedElement.columnStyles || {}), [col]: { ...colStyles, borderRadiusBottomRight: parseInt(e.target.value) || 0 } };
                                                                                    updateElement(selectedElement.id, { columnStyles });
                                                                                }}
                                                                                style={{ width: '100%', padding: '2px', fontSize: '9px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                                                min="0"
                                                                                max="20"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Font Size:</label>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                        <button onClick={() => updateElement(selectedElement.id, { fontSize: Math.max(8, (selectedElement.fontSize || 10) - 1) })} style={{ padding: '4px 8px', fontSize: '12px' }}>-</button>
                                        <input
                                            type="number"
                                            value={selectedElement.fontSize || 10}
                                            onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 10 })}
                                            style={{ flex: 1, padding: '6px', fontSize: '12px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '3px' }}
                                            min="8"
                                            max="24"
                                        />
                                        <button onClick={() => updateElement(selectedElement.id, { fontSize: Math.min(24, (selectedElement.fontSize || 10) + 1) })} style={{ padding: '4px 8px', fontSize: '12px' }}>+</button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Header Background:</label>
                                    <input
                                        type="color"
                                        value={selectedElement.backgroundColor || '#f0f0f0'}
                                        onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })}
                                        style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    />
                                </div>

                                {/* TH (Header) Design */}
                                <div style={{ marginTop: '15px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>📋 TH (Header) Design</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Height (px):</label>
                                            <input
                                                type="number"
                                                value={selectedElement.thCss?.height ?? 32}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), height: parseInt(e.target.value) || 32 };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="20"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Padding (px):</label>
                                            <input
                                                type="number"
                                                value={selectedElement.thCss?.padding ?? 4}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), padding: parseInt(e.target.value) || 0 };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="0"
                                                max="20"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Width:</label>
                                            <input
                                                type="number"
                                                value={selectedElement.thCss?.borderWidth ?? 1}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), borderWidth: parseInt(e.target.value) || 0 };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Font Size:</label>
                                            <input
                                                type="number"
                                                value={selectedElement.thCss?.fontSize ?? selectedElement.fontSize ?? 14}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), fontSize: parseInt(e.target.value) || 14 };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="8"
                                                max="24"
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Color:</label>
                                            <input
                                                type="color"
                                                value={selectedElement.thCss?.borderColor || '#000000'}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), borderColor: e.target.value };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Background Color:</label>
                                            <input
                                                type="color"
                                                value={selectedElement.thCss?.backgroundColor || selectedElement.backgroundColor || '#f0f0f0'}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), backgroundColor: e.target.value };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Text Color:</label>
                                            <input
                                                type="color"
                                                value={selectedElement.thCss?.color || selectedElement.color || '#000000'}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), color: e.target.value };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Font Weight:</label>
                                            <select
                                                value={selectedElement.thCss?.fontWeight || 'bold'}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), fontWeight: e.target.value };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="bold">Bold</option>
                                                <option value="bolder">Bolder</option>
                                                <option value="lighter">Lighter</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Style:</label>
                                            <select
                                                value={selectedElement.thCss?.borderStyle || 'solid'}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), borderStyle: e.target.value };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            >
                                                <option value="solid">Solid</option>
                                                <option value="dashed">Dashed</option>
                                                <option value="dotted">Dotted</option>
                                                <option value="none">None</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Text Align:</label>
                                            <select
                                                value={selectedElement.thCss?.textAlign || 'left'}
                                                onChange={(e) => {
                                                    const thCss = { ...(selectedElement.thCss || {}), textAlign: e.target.value };
                                                    updateElement(selectedElement.id, { thCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            >
                                                <option value="left">Left</option>
                                                <option value="center">Center</option>
                                                <option value="right">Right</option>
                                                <option value="justify">Justify</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '5px', marginBottom: '5px' }}>
                                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Radius (px):</label>
                                        <input
                                            type="number"
                                            value={selectedElement.thCss?.borderRadius ?? 0}
                                            onChange={(e) => {
                                                const thCss = { ...(selectedElement.thCss || {}), borderRadius: parseInt(e.target.value) || 0 };
                                                updateElement(selectedElement.id, { thCss });
                                            }}
                                            style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            min="0"
                                            max="20"
                                        />
                                    </div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={() => {
                                                const defaults = { height: 32, padding: 4, borderWidth: 1, borderColor: '#000000', borderStyle: 'solid', borderRadius: 0, fontSize: selectedElement.fontSize || 14, backgroundColor: selectedElement.backgroundColor || '#f0f0f0', color: selectedElement.color || '#000000', fontWeight: 'bold', textAlign: 'left' };
                                                updateElement(selectedElement.id, { thCss: defaults });
                                            }}
                                            style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                                        >
                                            Reset TH
                                        </button>
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </div>

                                {/* TR (Row) Design */}
                                <div style={{ marginTop: '15px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>📏 TR (Row) Design</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Height (px):</label>
                                            <input
                                                type="number"
                                                value={selectedElement.trCss?.height ?? 25}
                                                onChange={(e) => {
                                                    const trCss = { ...(selectedElement.trCss || {}), height: parseInt(e.target.value) || 25 };
                                                    updateElement(selectedElement.id, { trCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="10"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Width:</label>
                                            <input
                                                type="number"
                                                value={selectedElement.trCss?.borderWidth ?? 1}
                                                onChange={(e) => {
                                                    const trCss = { ...(selectedElement.trCss || {}), borderWidth: parseInt(e.target.value) || 0 };
                                                    updateElement(selectedElement.id, { trCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '5px' }}>
                                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Color:</label>
                                        <input
                                            type="color"
                                            value={selectedElement.trCss?.borderColor || '#000000'}
                                            onChange={(e) => {
                                                const trCss = { ...(selectedElement.trCss || {}), borderColor: e.target.value };
                                                updateElement(selectedElement.id, { trCss });
                                            }}
                                            style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Style:</label>
                                        <select
                                            value={selectedElement.trCss?.borderStyle || 'solid'}
                                            onChange={(e) => {
                                                const trCss = { ...(selectedElement.trCss || {}), borderStyle: e.target.value };
                                                updateElement(selectedElement.id, { trCss });
                                            }}
                                            style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                        >
                                            <option value="solid">Solid</option>
                                            <option value="dashed">Dashed</option>
                                            <option value="dotted">Dotted</option>
                                            <option value="none">None</option>
                                        </select>
                                    </div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={() => {
                                                const defaults = { height: 25, borderWidth: 1, borderColor: '#000000', borderStyle: 'solid' };
                                                updateElement(selectedElement.id, { trCss: defaults });
                                            }}
                                            style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                                        >
                                            Reset TR
                                        </button>
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </div>

                                {/* TD (Cell) Design */}
                                <div style={{ marginTop: '15px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                    <label style={{ fontSize: '11px', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>📦 TD (Cell) Design</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Height (px):</label>
                                            <input
                                                type="number"
                                                value={selectedElement.tdCss?.height ?? 25}
                                                onChange={(e) => {
                                                    const tdCss = { ...(selectedElement.tdCss || {}), height: parseInt(e.target.value) || 25 };
                                                    updateElement(selectedElement.id, { tdCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="10"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Padding (px):</label>
                                            <input
                                                type="number"
                                                value={selectedElement.tdCss?.padding ?? 4}
                                                onChange={(e) => {
                                                    const tdCss = { ...(selectedElement.tdCss || {}), padding: parseInt(e.target.value) || 0 };
                                                    updateElement(selectedElement.id, { tdCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="0"
                                                max="20"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Width:</label>
                                            <input
                                                type="number"
                                                value={selectedElement.tdCss?.borderWidth ?? 1}
                                                onChange={(e) => {
                                                    const tdCss = { ...(selectedElement.tdCss || {}), borderWidth: parseInt(e.target.value) || 0 };
                                                    updateElement(selectedElement.id, { tdCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="0"
                                                max="10"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Font Size:</label>
                                            <input
                                                type="number"
                                                value={selectedElement.tdCss?.fontSize ?? selectedElement.fontSize ?? 14}
                                                onChange={(e) => {
                                                    const tdCss = { ...(selectedElement.tdCss || {}), fontSize: parseInt(e.target.value) || 14 };
                                                    updateElement(selectedElement.id, { tdCss });
                                                }}
                                                style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                                min="8"
                                                max="24"
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Color:</label>
                                            <input
                                                type="color"
                                                value={selectedElement.tdCss?.borderColor || '#000000'}
                                                onChange={(e) => {
                                                    const tdCss = { ...(selectedElement.tdCss || {}), borderColor: e.target.value };
                                                    updateElement(selectedElement.id, { tdCss });
                                                }}
                                                style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Background Color:</label>
                                            <input
                                                type="color"
                                                value={selectedElement.tdCss?.backgroundColor || selectedElement.backgroundColor || '#ffffff'}
                                                onChange={(e) => {
                                                    const tdCss = { ...(selectedElement.tdCss || {}), backgroundColor: e.target.value };
                                                    updateElement(selectedElement.id, { tdCss });
                                                }}
                                                style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Text Color:</label>
                                            <input
                                                type="color"
                                                value={selectedElement.tdCss?.color || selectedElement.color || '#000000'}
                                                onChange={(e) => {
                                                    const tdCss = { ...(selectedElement.tdCss || {}), color: e.target.value };
                                                    updateElement(selectedElement.id, { tdCss });
                                                }}
                                                style={{ width: '100%', height: '28px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '5px' }}>
                                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Style:</label>
                                        <select
                                            value={selectedElement.tdCss?.borderStyle || 'solid'}
                                            onChange={(e) => {
                                                const tdCss = { ...(selectedElement.tdCss || {}), borderStyle: e.target.value };
                                                updateElement(selectedElement.id, { tdCss });
                                            }}
                                            style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                        >
                                            <option value="solid">Solid</option>
                                            <option value="dashed">Dashed</option>
                                            <option value="dotted">Dotted</option>
                                            <option value="none">None</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Text Align:</label>
                                        <select
                                            value={selectedElement.tdCss?.textAlign || selectedElement.textAlign || 'left'}
                                            onChange={(e) => {
                                                const tdCss = { ...(selectedElement.tdCss || {}), textAlign: e.target.value };
                                                updateElement(selectedElement.id, { tdCss });
                                            }}
                                            style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #ced4da', borderRadius: '2px' }}
                                        >
                                            <option value="left">Left</option>
                                            <option value="center">Center</option>
                                            <option value="right">Right</option>
                                            <option value="justify">Justify</option>
                                        </select>
                                    </div>
                                    <div style={{ marginTop: '5px', marginBottom: '5px' }}>
                                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '2px' }}>Border Radius (px):</label>
                                        <input
                                            type="number"
                                            value={selectedElement.tdCss?.borderRadius ?? 0}
                                            onChange={(e) => {
                                                const tdCss = { ...(selectedElement.tdCss || {}), borderRadius: parseInt(e.target.value) || 0 };
                                                updateElement(selectedElement.id, { tdCss });
                                            }}
                                            style={{ width: '100%', padding: '4px', fontSize: '10px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '2px' }}
                                            min="0"
                                            max="20"
                                        />
                                    </div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={() => {
                                                const defaults = { borderWidth: 1, borderColor: '#000000', borderStyle: 'solid', borderRadius: 0, padding: 4, backgroundColor: selectedElement.backgroundColor || '#ffffff', color: selectedElement.color || '#000000', fontSize: selectedElement.fontSize || 14, textAlign: selectedElement.textAlign || 'left', height: 25 };
                                                updateElement(selectedElement.id, { tdCss: defaults });
                                            }}
                                            style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                                        >
                                            Reset TD
                                        </button>
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            style={{ flex: 1, padding: '4px', fontSize: '10px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '2px' }}
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Border & Background */}
                        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>🎨 Border & Background</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Border Width:</label>
                                    <input
                                        type="number"
                                        value={selectedElement.borderWidth || 0}
                                        onChange={(e) => updateElement(selectedElement.id, { borderWidth: parseInt(e.target.value) || 0 })}
                                        style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        min="0"
                                        max="10"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Border Color:</label>
                                    <input
                                        type="color"
                                        value={selectedElement.borderColor || '#000000'}
                                        onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })}
                                        style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Border Style:</label>
                                    <select
                                        value={selectedElement.borderStyle || 'solid'}
                                        onChange={(e) => updateElement(selectedElement.id, { borderStyle: e.target.value })}
                                        style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    >
                                        <option value="solid">Solid</option>
                                        <option value="dashed">Dashed</option>
                                        <option value="dotted">Dotted</option>
                                        <option value="double">Double</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Border Radius:</label>
                                    <input
                                        type="number"
                                        value={selectedElement.borderRadius || 0}
                                        onChange={(e) => updateElement(selectedElement.id, { borderRadius: parseInt(e.target.value) || 0 })}
                                        style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                        min="0"
                                        max="50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', display: 'block', marginBottom: '3px' }}>Background Color:</label>
                                <input
                                    type="color"
                                    value={selectedElement.backgroundColor || '#ffffff'}
                                    onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })}
                                    style={{ width: '100%', height: '32px', border: '1px solid #ced4da', borderRadius: '3px' }}
                                />
                            </div>
                        </div>

                        {/* Padding */}
                        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>📏 Padding</label>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <button onClick={() => updateElement(selectedElement.id, { padding: Math.max(0, (selectedElement.padding || 5) - 1) })} style={{ padding: '4px 8px', fontSize: '12px' }}>-</button>
                                <input
                                    type="number"
                                    value={selectedElement.padding || 5}
                                    onChange={(e) => updateElement(selectedElement.id, { padding: parseInt(e.target.value) || 0 })}
                                    style={{ flex: 1, padding: '6px', fontSize: '12px', textAlign: 'center', border: '1px solid #ced4da', borderRadius: '3px' }}
                                    min="0"
                                    max="50"
                                />
                                <button onClick={() => updateElement(selectedElement.id, { padding: (selectedElement.padding || 5) + 1 })} style={{ padding: '4px 8px', fontSize: '12px' }}>+</button>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                deleteElement(selectedElement.id);
                                setSelectedElement(null);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '5px',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            🗑️ Delete Element
                        </button>
                    </div>
                )}
            </div>

            {/* Field Mapper Modal */}
            {showFieldMapper && (
                <FieldMapper
                    data={data}
                    onFieldSelect={(path) => {
                        if (fieldMapperTarget) {
                            updateElement(fieldMapperTarget.id, { dataPath: path });

                            // Auto-select all columns when data path is set for table via field mapper
                            if (fieldMapperTarget.type === 'table' && path) {
                                const tableData = getValue(path);
                                if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                                    const allColumns = Object.keys(tableData[0]);
                                    updateElement(fieldMapperTarget.id, {
                                        selectedColumns: allColumns,
                                        dataPath: path
                                    });
                                }
                            }
                        }
                        setShowFieldMapper(false);
                        setFieldMapperTarget(null);
                    }}
                    onClose={() => {
                        setShowFieldMapper(false);
                        setFieldMapperTarget(null);
                    }}
                />
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '1200px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        {/* Preview Header */}
                        <div style={{
                            padding: '15px 20px',
                            borderBottom: '1px solid #dee2e6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#007bff' }}>
                                👁️ Template Preview
                            </h3>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {previewData && previewData.data && previewData.data.student_list && previewData.data.student_list[0] && (
                                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                        {previewData.data.student_list[0].student_name}
                                    </span>
                                )}
                                <button
                                    onClick={() => setShowPreview(false)}
                                    style={{
                                        padding: '5px 15px',
                                        background: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {/* Preview Content — flow layout (same as PDF) */}
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: '20px',
                            backgroundColor: '#e9ecef',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{ border: '2px solid #333', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                                <LayoutRenderer
                                    templateData={getTemplateDataForSave()}
                                    data={previewData || getPreviewData()}
                                    options={{ usePageWrapper: true }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Design;